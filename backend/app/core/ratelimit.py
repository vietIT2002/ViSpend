from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter (in-memory). Imported by main.py (to register the handler)
# and by routers (to decorate sensitive endpoints).
limiter = Limiter(key_func=get_remote_address)
