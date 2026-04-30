from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.database import create_tables
from app.routers import auth, users, files, folders
from app.utils.auth import hash_password


# ─── Lifespan (startup / shutdown) ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on server startup:
    1. Creates all database tables
    2. Creates default admin user if none exists
    """
    create_tables()
    _create_default_admin()
    from app.utils.minio_client import ensure_buckets
    ensure_buckets()
    print("✅ Zero Trust File Sharing System started successfully!")
    print("📚 API docs available at: http://localhost:8000/docs")
    yield


# ─── App Initialization ───────────────────────────────────────────────────────

app = FastAPI(
    title="Zero Trust Encrypted File Sharing System",
    description="""
    Secure File Sharing API with End-to-End Encryption
   """,
    version="1.0.0",
    docs_url="/docs",         # Swagger UI
    redoc_url="/redoc",       # ReDoc UI
    lifespan=lifespan
)

# ─── Middleware ───────────────────────────────────────────────────────────────

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(files.router)
app.include_router(folders.router)


def _create_default_admin():
    """Create a default admin user on first startup."""
    from app.database import SessionLocal
    from app.models.user import User, UserRole, Department
    
    db = SessionLocal()
    try:
        admin_exists = db.query(User).filter(User.role == UserRole.admin).first()
        if not admin_exists:
            default_admin = User(
                username="admin",
                email="admin@zerotrust.local",
                hashed_password=hash_password("Admin@123"),
                full_name="System Administrator",
                role=UserRole.admin,
                department=Department.it,
                is_active=True
            )
            db.add(default_admin)
            db.commit()
            print("👤 Default admin created: username=admin, password=Admin@123")
            print("⚠️  IMPORTANT: Change the admin password immediately!")
    except Exception as e:
        print(f"Warning: Could not create default admin: {e}")
    finally:
        db.close()


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Zero Trust Encrypted File Sharing System API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
