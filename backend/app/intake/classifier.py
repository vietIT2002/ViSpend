import pickle
import uuid

from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.linear_model import SGDClassifier
from sqlmodel import Session, select

from app.intake.rules import normalize, rule_category_key
from app.models import Category, CategoryClassifier, Transaction, TxnType, User

# Stateless vectorizer (no vocabulary to persist) — pairs with partial_fit.
_VECT = HashingVectorizer(n_features=2**18, alternate_sign=False, norm="l2")
_ML_THRESHOLD = 0.55  # min predict_proba to trust an ML suggestion


def _labeled_history(session: Session, user_id: uuid.UUID) -> list[tuple[str, str]]:
    rows = session.exec(
        select(Transaction).where(Transaction.user_id == user_id, Transaction.note.is_not(None))
    ).all()
    return [(t.note, str(t.category_id)) for t in rows if t.note and t.note.strip()]


def _load(session: Session, user_id: uuid.UUID) -> SGDClassifier | None:
    row = session.get(CategoryClassifier, user_id)
    return pickle.loads(row.model_blob) if row else None


def _save(session: Session, user_id: uuid.UUID, model: SGDClassifier) -> None:
    import datetime
    row = session.get(CategoryClassifier, user_id)
    blob = pickle.dumps(model)
    if row:
        row.model_blob = blob
        row.updated_at = datetime.datetime.now(datetime.timezone.utc)
    else:
        row = CategoryClassifier(user_id=user_id, model_blob=blob)
    session.add(row)
    session.commit()


def retrain(session: Session, user: User) -> None:
    history = _labeled_history(session, user.id)
    labels = sorted({label for _, label in history})
    if len(labels) < 2:
        return  # need >=2 categories for a usable classifier
    X = _VECT.transform([normalize(n) for n, _ in history])
    y = [label for _, label in history]
    model = SGDClassifier(loss="log_loss")
    model.partial_fit(X, y, classes=labels)
    _save(session, user.id, model)


def learn(session: Session, user: User, note: str, category_id: uuid.UUID) -> None:
    if not note or not note.strip():
        return
    model = _load(session, user.id)
    label = str(category_id)
    if model is None or label not in set(model.classes_):
        retrain(session, user)  # class set changed (or no model yet)
        return
    X = _VECT.transform([normalize(note)])
    model.partial_fit(X, [label])
    _save(session, user.id, model)


def _history_match(session: Session, user_id: uuid.UUID, note: str) -> uuid.UUID | None:
    target = normalize(note)
    if not target:
        return None
    for n, label in _labeled_history(session, user_id):
        if normalize(n) == target:
            return uuid.UUID(label)
    return None


def _rules_match(session: Session, user: User, note: str) -> uuid.UUID | None:
    key = rule_category_key(note)
    if not key:
        return None
    cat = session.exec(
        select(Category).where(
            ((Category.user_id == user.id) | (Category.user_id.is_(None))),
            Category.key == key,
        )
    ).first()
    return cat.id if cat else None


def suggest_category(session: Session, user: User, note: str) -> tuple[uuid.UUID | None, float]:
    if not note or not note.strip():
        return None, 0.0
    # 1. History
    hit = _history_match(session, user.id, note)
    if hit is not None:
        return hit, 0.95
    # 2. ML
    model = _load(session, user.id)
    if model is not None:
        X = _VECT.transform([normalize(note)])
        proba = model.predict_proba(X)[0]
        best = proba.argmax()
        if proba[best] >= _ML_THRESHOLD:
            return uuid.UUID(model.classes_[best]), float(proba[best])
    # 3. Rules
    rule = _rules_match(session, user, note)
    if rule is not None:
        return rule, 0.5
    # 4. None
    return None, 0.0
