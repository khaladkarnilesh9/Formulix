from pathlib import Path
from PIL import Image, UnidentifiedImageError
from django.core.exceptions import ValidationError


def validate_company_logo(value):
    if not value:
        return
    if value.size > 2 * 1024 * 1024:
        raise ValidationError('Company logos must be no larger than 2 MB.')
    allowed={'.png':'PNG','.jpg':'JPEG','.jpeg':'JPEG','.webp':'WEBP'}
    extension=Path(value.name).suffix.lower()
    if extension not in allowed:
        raise ValidationError('Upload a PNG, JPEG or WebP logo; SVG is not accepted.')
    position=value.tell()
    try:
        value.seek(0)
        with Image.open(value) as image:
            if image.format != allowed[extension] or max(image.size)>4096 or min(image.size)<1:
                raise ValidationError('Invalid logo format or dimensions (maximum 4096 pixels).')
            image.verify()
    except (UnidentifiedImageError,OSError,Image.DecompressionBombError) as error:
        raise ValidationError('The uploaded file is not a valid logo image.') from error
    finally:
        value.seek(position)
