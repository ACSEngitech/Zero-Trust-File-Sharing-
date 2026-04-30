from fastapi import HTTPException, status

# Blocked file extensions for security
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".com", ".pif", ".scr",  # Windows executables
    ".vbs", ".vbe", ".js", ".jse", ".ws", ".wsf",    # Scripts
    ".msi", ".msp", ".mst",                           # Windows installers
    ".ps1", ".ps2", ".psc1", ".psc2",                 # PowerShell
    ".reg",                                            # Registry files
    ".dll", ".sys", ".drv",                           # System files
    ".sh", ".bash", ".zsh", ".fish",                  # Unix shell scripts
    ".php", ".asp", ".aspx", ".jsp",                  # Server-side scripts
    ".py", ".rb", ".pl", ".lua",                      # Interpreted scripts (when uploaded as-is)
}

# Allowed file types (whitelist approach - more secure)
ALLOWED_EXTENSIONS = {
    # Documents
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".odt", ".ods", ".odp", ".txt", ".rtf", ".csv",
    # Images
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".tiff",
    # Archives
    ".zip", ".tar", ".gz", ".7z", ".rar",
    # Data
    ".json", ".xml", ".yaml", ".yml",
    # Media
    ".mp4", ".mp3", ".wav", ".avi", ".mov",
}

# Maximum file size: 50 MB
MAX_FILE_SIZE = 50 * 1024 * 1024


def validate_file(filename: str, file_size: int, content_type: str = None):
    """
    Validate a file before processing.
    
    Checks:
    1. File size doesn't exceed limit
    2. Extension is not in blocklist
    3. Extension is in allowlist
    
    Raises:
        HTTPException 400 if validation fails
    """
    import os
    
    # Check file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE // (1024*1024)} MB"
        )
    
    # Check empty filename
    if not filename or filename.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty"
        )
    
    # Extract extension
    _, ext = os.path.splitext(filename.lower())
    
    # Block dangerous extensions
    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' is not allowed for security reasons"
        )
    
    # Check against allowlist
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' is not supported. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    
    return ext


def sanitize_filename(filename: str) -> str:
    """
    Remove potentially dangerous characters from filenames.
    
    Example:
        sanitize_filename("../../../etc/passwd.txt") → "passwd.txt"
    """
    import re
    import os
    
    # Get just the basename (no directory traversal)
    filename = os.path.basename(filename)
    
    # Replace potentially dangerous characters
    filename = re.sub(r'[^\w\s\-_\.]', '', filename)
    filename = filename.strip()
    
    return filename if filename else "unnamed_file"
