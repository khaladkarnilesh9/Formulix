from pathlib import Path
from zipfile import ZipFile, BadZipFile
from django.conf import settings
from django.core.exceptions import ValidationError
from defusedxml import ElementTree

def validate_document_file(file):
    if file.size > settings.MAX_DOCUMENT_BYTES:
        raise ValidationError("Document exceeds the 10 MB upload limit.")
    suffix = Path(file.name).suffix.lower()
    file.seek(0)
    header = file.read(8)
    file.seek(0)
    if suffix == ".pdf" and header.startswith(b"%PDF-"):
        mime = "application/pdf"
    elif suffix == ".docx" and header.startswith(b"PK"):
        try:
            with ZipFile(file) as archive:
                entries = archive.infolist()
                if sum(entry.file_size for entry in entries) > 50 * 1024 * 1024 or len(entries) > 2000:
                    raise ValidationError("DOCX archive is too large.")
                if "word/document.xml" not in archive.namelist() or any("vbaproject" in entry.filename.lower() for entry in entries):
                    raise ValidationError("Invalid or macro-enabled document.")
        except BadZipFile as error:
            raise ValidationError("Invalid DOCX file.") from error
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif suffix == ".xml":
        try:
            ElementTree.fromstring(file.read(), forbid_dtd=True)
        except Exception as error:
            raise ValidationError("XML must be well-formed and contain no DTD/entities.") from error
        mime = "application/xml"
    else:
        raise ValidationError("Only validated PDF, DOCX, and XML files are accepted.")
    file.seek(0)
    return mime
