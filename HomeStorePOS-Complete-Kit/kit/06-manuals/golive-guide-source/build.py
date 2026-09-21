from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("DV","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")); pdfmetrics.registerFont(TTFont("DVB","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")); pdfmetrics.registerFont(TTFont("DVM","/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"))
CH=colors.HexColor("#222E38"); TL=colors.HexColor("#37A598"); MINT=colors.HexColor("#D9E8E7"); GR=colors.HexColor("#525B66")
st={"h1":ParagraphStyle("h1",fontName="DVB",fontSize=20,leading=24,textColor=CH,spaceAfter=8),"h2":ParagraphStyle("h2",fontName="DVB",fontSize=13.5,leading=17,textColor=CH,spaceBefore=12,spaceAfter=5),"p":ParagraphStyle("p",fontName="DV",fontSize=10,leading=14,textColor=colors.HexColor("#1E2830")),"small":ParagraphStyle("small",fontName="DV",fontSize=8.8,leading=12,textColor=GR),"mono":ParagraphStyle("mono",fontName="DVM",fontSize=9,leading=12,backColor=MINT,borderPadding=(4,6,4,6),leftIndent=6,spaceBefore=2,spaceAfter=6),"step":ParagraphStyle("step",fontName="DV",fontSize=10,leading=14,leftIndent=22,firstLineIndent=-22,spaceAfter=3),"cover1":ParagraphStyle("c1",fontName="DVB",fontSize=28,leading=34,textColor=colors.white),"cover2":ParagraphStyle("c2",fontName="DV",fontSize=13,leading=18,textColor=colors.white),"tip":ParagraphStyle("tip",fontName="DV",fontSize=9.5,leading=13,textColor=CH,backColor=colors.HexColor("#F3F7F7"),borderPadding=(6,8,6,8),spaceBefore=4,spaceAfter=8)}
def P(t,s="p"): return Paragraph(t,st[s])
def H1(t): return Paragraph(t,st["h1"])
def H2(t): return Paragraph(t,st["h2"])
def steps(items): return [Paragraph(f"<b>{i+1}.</b>&nbsp; {t}",st["step"]) for i,t in enumerate(items)]
def mono(t): return Paragraph(t.replace("&","&amp;").replace("<","&lt;"),st["mono"])
def tip(t): return Paragraph(t,st["tip"])
def table(rows,widths):
    cs=ParagraphStyle("cell",fontName="DV",fontSize=8.8,leading=11.5); hs=ParagraphStyle("cellh",fontName="DVB",fontSize=8.8,leading=11.5,textColor=CH)
    rows=[[Paragraph(str(c).replace("\n","<br/>"),hs if i==0 else cs) for c in r] for i,r in enumerate(rows)]
    t=Table(rows,colWidths=widths,repeatRows=1)
    t.setStyle(TableStyle([("FONT",(0,0),(-1,-1),"DV",9),("FONT",(0,0),(-1,0),"DVB",9),("BACKGROUND",(0,0),(-1,0),MINT),("TEXTCOLOR",(0,0),(-1,0),CH),("GRID",(0,0),(-1,-1),0.4,colors.HexColor("#CBD5D5")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    return t
class Doc(BaseDocTemplate):
    def __init__(self,fn):
        BaseDocTemplate.__init__(self,fn,pagesize=letter,leftMargin=0.85*inch,rightMargin=0.85*inch,topMargin=0.9*inch,bottomMargin=0.85*inch,title="HomeStore POS — Go-live setup guide",author="HomeStore POS")
        W,H=letter; f=Frame(self.leftMargin,self.bottomMargin,W-self.leftMargin-self.rightMargin,H-self.topMargin-self.bottomMargin,id="f")
        self.addPageTemplates([PageTemplate(id="cover",frames=[f],onPage=self.cover),PageTemplate(id="body",frames=[f],onPage=self.page)])
    def cover(self,c,doc):
        W,H=letter; c.setFillColor(CH); c.rect(0,0,W,H,fill=1,stroke=0); c.setFillColor(TL); c.rect(0,H-0.6*inch,W,0.6*inch,fill=1,stroke=0)
        try: c.drawImage("/home/claude/pos/logo_dark.png",0.85*inch,H-3.2*inch,width=3.6*inch,height=1.3*inch,mask="auto",preserveAspectRatio=True,anchor="sw")
        except Exception: pass
    def page(self,c,doc):
        W,H=letter; c.setFont("DV",8.5); c.setFillColor(GR); c.drawString(doc.leftMargin,H-0.55*inch,"HomeStore POS — Go-live setup guide"); c.drawRightString(W-doc.rightMargin,H-0.55*inch,"Page %d"%doc.page); c.setStrokeColor(colors.HexColor("#CBD5D5")); c.line(doc.leftMargin,H-0.62*inch,W-doc.rightMargin,H-0.62*inch)
doc=Doc("/mnt/user-data/outputs/HomeStorePOS-GoLive-Guide.pdf")
from reportlab.platypus import NextPageTemplate
s=[]
s+= [Spacer(1,3.5*inch),Paragraph("Go-live setup guide",st["cover1"]),Spacer(1,6),Paragraph("GitHub Pages · Firebase · GoDaddy · Relay",st["cover2"]),Spacer(1,14),Paragraph("Everything to take HomeStore POS from the deployment package to <b>app.homestorepos.com</b>, with the public store sign-in ready to link from your website.",st["cover2"]),Spacer(1,30),Paragraph("Edition: September 2026",st["cover2"]),NextPageTemplate("body"),PageBreak()]
s+= [H1("Before you start"),P("You'll set up three things. Each is free to begin with, and each takes about ten to twenty minutes. Do them in order — the app needs the database, and the domain needs the app."),Spacer(1,6),
 table([["Piece","What it does","Where","Cost"],["App","index.html + config.js from the package","GitHub Pages at app.homestorepos.com","Free"],["Database","Firebase Firestore — shares data across every register and dealer","Google Firebase","Free tier, then pay-as-you-go"],["Relay (optional)","Vendor APIs, live stock & forecasts, POs by API, card terminals, address lookup","Render.com (free web service)","Free tier"]],[1.05*inch,2.9*inch,1.85*inch,1.0*inch]),
 Spacer(1,8),P("<b>You will need:</b> the deployment zip (HomeStorePOS-deploy.zip), your GoDaddy login, a Google account for Firebase, and a GitHub account (free, github.com)."),
 tip("Unzip the package. Inside: <b>index.html</b> (the app), <b>config.js</b> (settings you'll fill in), <b>CNAME</b>, <b>.nojekyll</b>, <b>firestore.rules</b>, <b>README.md</b>, and a <b>relay/</b> folder for later.")]
s+= [H1("Step 1 — Firebase: the database (≈10 min)")]+steps([
 "Go to <b>console.firebase.google.com</b> → <b>Add project</b> → name it <b>homestore-pos</b> → Continue (Google Analytics is optional) → Create.",
 "Left menu <b>Build → Firestore Database → Create database</b> → choose <b>Production mode</b> → location <b>nam5 (United States)</b> → Enable.",
 "<b>Build → Authentication → Get started → Sign-in method</b>: enable <b>Anonymous</b> (used by store registers) and <b>Email/Password</b> (used by you).",
 "Still in Authentication → <b>Users → Add user</b>: your owner email and a strong password. This is what the administration console will ask for.",
 "Back in <b>Firestore Database → Rules</b> tab: delete what's there, paste the entire contents of <b>firestore.rules</b> from the package → <b>Publish</b>.",
 "<b>Build → Storage → Get started</b> → Production mode → same region → Done. <b>Rules</b> tab → paste <b>storage.rules</b> → Publish. Delivery photos, damage photos, signatures and ID photos are kept here as files, not in the database.",
 "Project settings (gear icon) → <b>General → Your apps → Web (&lt;/&gt;)</b> → nickname <b>HomeStore POS</b> → Register app. Copy the six values shown (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).",
 "Open <b>config.js</b> in a text editor (Notepad works) and paste those six values into the <b>firebase</b> block. Save.",
 "<b>Authentication → Settings → Authorized domains → Add domain</b>: <b>app.homestorepos.com</b>. While testing, also add <b>YOUR-USERNAME.github.io</b>."])
s+= [tip("The rules you pasted let registers look up <b>one</b> store code at a time and never list stores; only your owner account can list or edit dealers. Keep it that way."),
 H1("Step 2 — GitHub Pages: the app (≈10 min)")]+steps([
 "Create a free account at <b>github.com</b>. Top right <b>+ → New repository</b> → name <b>homestore-pos</b> → <b>Public</b> → Create repository.",
 "<b>Add file → Upload files</b> → drag in <b>index.html, config.js, CNAME, .nojekyll</b> and the two folders <b>signin</b> and <b>admin</b> (not the relay folder) → <b>Commit changes</b>. The two folders give you the clean addresses /signin and /admin.",
 "Repository <b>Settings → Pages</b> (left menu) → Source: <b>Deploy from a branch</b> → Branch <b>main</b>, folder <b>/ (root)</b> → Save.",
 "On the same page under <b>Custom domain</b> type <b>app.homestorepos.com</b> → Save. Leave <b>Enforce HTTPS</b> for later (it appears once DNS is live).",
 "Test now at <b>https://YOUR-USERNAME.github.io/homestore-pos/admin</b> — you should see the owner sign-in."])
s+= [tip("<b>Updating the app later:</b> Add file → Upload files → drop the new index.html over the old one → Commit. Every register gets it on its next refresh. config.js stays as it is."),
 H1("Step 3 — GoDaddy: the domain (≈5 min)")]+steps([
 "Log in to <b>GoDaddy → My Products</b> → next to <b>homestorepos.com</b> click <b>DNS</b> (Manage DNS).",
 "<b>Add New Record</b>: Type <b>CNAME</b> · Name <b>app</b> · Value <b>YOUR-USERNAME.github.io</b> · TTL 1 hour → Save.",
 "Optional, for the relay later: another <b>CNAME</b> · Name <b>relay</b> · Value = the hostname Render gives you (Step 6).",
 "Wait for DNS (usually a few minutes, up to a day). Then GitHub → Settings → Pages → tick <b>Enforce HTTPS</b>.",
 "Your marketing site stays at <b>homestorepos.com</b>; the app lives at <b>app.homestorepos.com</b>."])
s+= [H1("Step 4 — Your addresses"),P("These are the only two links that matter. Put the first on your website; keep the second to yourself."),Spacer(1,6),
 table([["Who","Address","What they see"],["Dealers & their staff\n(public — link from homestorepos.com header/footer)","https://app.homestorepos.com/signin","One field: store code (e.g. NFM01) → that store's own sign-in with its logo, colors and staff. The device remembers the store. A wrong code shows only “No store found with that code.” Nothing on this page mentions the administration console."],["You (private)","https://app.homestorepos.com/admin","Owner email & password (Firebase) → your administrator PIN → the console."],["Per-dealer link (optional)","https://app.homestorepos.com/#store/NFM01","Same as typing the code — good for a QR code taped to each register."]],[1.7*inch,2.05*inch,3.05*inch]),
 Spacer(1,8),tip("Repeated wrong codes lock the page for 30 seconds, doubling each time — a script cannot walk the code space, and the database rules never return a list of stores.")]
s+= [H1("Step 5 — First run (≈10 min)")]+steps([
 "Open <b>https://app.homestorepos.com/admin</b> → sign in with the owner email/password → <b>Create your administrator login</b> (name + PIN).",
 "<b>Dealers → Add dealer</b>: business name, first manager and PIN. The dealer receives a store code (e.g. NFM01). Tick <b>Load sample data</b> only for a demo store.",
 "Send the store two things: the public address <b>app.homestorepos.com/signin</b> and their <b>store code</b>. Every register, tablet and phone opens the address once, types the code, and is remembered.",
 "In the store: Settings → work through the Getting-started checklist on Home (logo, tax, trucks, staff, items via CSV, payment methods, terms).",
 "<b>Software settings</b> in the console: upload your logo if you want a different one, set the tagline, and later the relay URL."])
s+= [H1("Step 6 — Relay service: vendor APIs & live stock (≈20 min, optional now)"),P("Skip this until you're ready to connect a vendor API or a card terminal. The app runs fully without it.")]+steps([
 "Firebase console → Project settings → <b>Service accounts → Generate new private key</b> → a JSON file downloads. Keep it private.",
 "Create a free account at <b>render.com</b> → <b>New → Web Service</b> → connect GitHub → choose a repo containing the <b>relay/</b> folder (create a second repo <b>homestore-pos-relay</b> and upload the folder's files) → Runtime Node → Build <b>npm install</b> → Start <b>npm start</b> → Free instance.",
 "<b>Environment</b> tab → add: <b>ALLOWED_ORIGINS</b> = https://app.homestorepos.com · <b>RELAY_TOKEN</b> = a long random string · <b>FIREBASE_SERVICE_ACCOUNT</b> = the JSON file's contents on one line · optionally <b>GOOGLE_MAPS_KEY</b>.",
 "Deploy. Open <b>https://…onrender.com/health</b> — you should see {\"ok\":true}.",
 "Render → Settings → Custom domain <b>relay.homestorepos.com</b>, and add the CNAME in GoDaddy (Step 3).",
 "In the app: <b>Administration → Software settings → Relay service URL</b> = https://relay.homestorepos.com. In <b>config.js</b> set relayUrl and relayToken (same token) → re-upload config.js to GitHub.",
 "<b>Administration → Vendor integrations → Add</b>: the vendor's base URL, API key, <b>Live stock path</b> (e.g. /inventory/{sku}) and the three field names for available qty, next date, on-order. Assign the vendor to dealers. Supplier-order lines at the register now show <b>live stock</b>, and each PO has <b>Check live availability with the vendor</b>."])
s+= [H1("Checklist"),table([["✓","Item"],["☐","Firebase project created; Firestore in production mode; Anonymous + Email/Password sign-in enabled; owner user added"],["☐","firestore.rules pasted and published"],["☐","config.js filled with the six Firebase values"],["☐","GitHub repo homestore-pos with index.html, config.js, CNAME, .nojekyll; Pages enabled; custom domain set"],["☐","GoDaddy CNAME app → YOUR-USERNAME.github.io; Enforce HTTPS ticked once live"],["☐","app.homestorepos.com/admin opens and the owner login works"],["☐","First dealer created; store opened from app.homestorepos.com/signin with its code"],["☐","Sign in link on homestorepos.com points to app.homestorepos.com/signin"],["☐","(Later) Relay deployed; relay URL set in Software settings and config.js"]],[0.4*inch,6.4*inch]),
 Spacer(1,10),H2("If something doesn't work"),
 table([["Symptom","Fix"],["“Can't reach the store data” on the app","config.js values wrong or the domain isn't in Firebase Authorized domains. Check both, reload."],["Owner sign-in says failed","The user must exist under Firebase → Authentication → Users with Email/Password enabled."],["Dealers can't find their store","The code is typed on app.homestorepos.com/#signin exactly as shown in Dealers (letters/numbers, no spaces). Rules must be published."],["Custom domain shows a GitHub 404","DNS not propagated yet, or the CNAME file was not uploaded. Wait, then re-save the custom domain in GitHub Pages."],["Live stock says “needs the relay”","Relay URL not set in Software settings, or the relay is asleep on the free tier — open /health to wake it."]],[2.3*inch,4.5*inch]),
 Spacer(1,10),P("HomeStore POS · 404-587-9031 · info@HomeStorePOS.com","small")]
doc.build(s)
print("built")
