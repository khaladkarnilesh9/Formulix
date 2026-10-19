"""Download only the explicitly reviewed corporate assets, never user-provided URLs."""
from pathlib import Path
from urllib.request import Request,urlopen
from PIL import Image
from io import BytesIO
from xml.etree import ElementTree

target=Path(__file__).resolve().parents[1]/'public'/'assets'/'company-logos'
target.mkdir(parents=True,exist_ok=True)
assets={
    'albaugh.svg':'https://www.albaugh.com/images/default-source/default-album/logo-green.svg?sfvrsn=42838760_1',
    'biostadt.png':'https://www.biostadt.com/wp-content/uploads/2023/10/cropped-cropped-biostadt-website-icons-11-1.png',
    'corteva.png':'https://images.engage.corteva.com/EloquaImages/clients/DuPontAgricultureNA/%7B43e1c32f-a47c-48f3-9f90-3003216cba82%7D_corteva_logo_thumbnail.png',
}
for name,url in assets.items():
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=15) as response:
        data=response.read(2*1024*1024+1)
    if len(data)>2*1024*1024:raise ValueError('Asset too large')
    if name.endswith('.svg'):
        root=ElementTree.fromstring(data.decode('utf-8-sig'))
        if not root.tag.endswith('svg') or any(node.tag.endswith('script') for node in root.iter()):raise ValueError('Unsafe SVG')
    else:
        with Image.open(BytesIO(data)) as image:image.verify()
    if name.endswith('.svg'):
        data=ElementTree.tostring(root,encoding='utf-8',xml_declaration=True)
    (target/name).write_bytes(data)
    print(name,len(data),flush=True)
