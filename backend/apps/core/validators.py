import re
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator

def validate_cas(value):
    if not value:
        return
    if not re.fullmatch(r"[0-9]{2,7}-[0-9]{2}-[0-9]", value):
        raise ValidationError("CAS must be a registry number, not a mixture or placeholder.")
    digits = value.replace("-", "")
    if sum(int(digit) * index for index, digit in enumerate(reversed(digits[:-1]), 1)) % 10 != int(digits[-1]):
        raise ValidationError("CAS checksum is invalid; verify the source.")

def validate_http_url(value):
    if value:
        URLValidator(schemes=["http", "https"])(value)
