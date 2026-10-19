"""Inspect official website image links; no discovery results are auto-approved."""
from html.parser import HTMLParser
from urllib.request import Request,urlopen
from urllib.parse import urljoin


class Images(HTMLParser):
    def handle_starttag(self,tag,attributes):
        attrs=dict(attributes)
        if tag in ('img','use','svg','source','link') and 'logo' in str(attrs).lower():
            print({key:value for key,value in attrs.items() if key in ('src','data-src','href','xlink:href','srcset','alt','id','class')})


for name,url in [('Adama','https://www.adama.com/south-africa/en/learn-about-us/the-adama-logo'),('Albaugh','https://www.albaugh.com/'),
                 ('BASF','https://www.basf.com/global/en'),('Bayer','https://www.bayer.com/en'),
                 ('Biostadt','https://www.biostadt.com/'),('Corteva','https://engage.corteva.com/media')]:
    print(name,flush=True)
    try:
        with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=12) as response:
            parser=Images();parser.base=response.url
            parser.feed(response.read().decode('utf-8',errors='replace'))
    except Exception as error:
        print(type(error).__name__,str(error)[:120],flush=True)
