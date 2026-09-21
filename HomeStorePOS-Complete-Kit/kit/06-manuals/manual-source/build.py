from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Image, Table, TableStyle, KeepTogether, ListFlowable, ListItem)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage
import os, datetime

TEAL=colors.HexColor("#356C68"); MINT=colors.HexColor("#78D6B0"); SAGE=colors.HexColor("#E3EEE7"); INK=colors.HexColor("#273238"); INK2=colors.HexColor("#5F6E72"); AMBER=colors.HexColor("#F7EDD5"); RED=colors.HexColor("#F6E0DC")
SHOTS="/home/claude/pos/shots"
W,H=letter

# fonts
for name,path in [("Sans","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),("Sans-Bold","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),("Sans-Oblique","/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf")]:
    if os.path.exists(path): pdfmetrics.registerFont(TTFont(name,path))
BASE="Sans" if os.path.exists("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf") else "Helvetica"
BOLD="Sans-Bold" if BASE=="Sans" else "Helvetica-Bold"
ITAL="Sans-Oblique" if BASE=="Sans" else "Helvetica-Oblique"

ss=getSampleStyleSheet()
st={}
st["body"]=ParagraphStyle("body",parent=ss["Normal"],fontName=BASE,fontSize=10,leading=14.5,textColor=INK,spaceAfter=6)
st["small"]=ParagraphStyle("small",parent=st["body"],fontSize=8.5,leading=11.5,textColor=INK2)
st["h1"]=ParagraphStyle("h1",parent=ss["Heading1"],fontName=BOLD,fontSize=22,leading=26,textColor=TEAL,spaceBefore=6,spaceAfter=10)
st["h1toc"]=ParagraphStyle("h1toc",parent=st["h1"])
st["h2"]=ParagraphStyle("h2",parent=ss["Heading2"],fontName=BOLD,fontSize=14.5,leading=18,textColor=INK,spaceBefore=14,spaceAfter=6)
st["h3"]=ParagraphStyle("h3",parent=ss["Heading3"],fontName=BOLD,fontSize=11.5,leading=14,textColor=TEAL,spaceBefore=10,spaceAfter=4)
st["cap"]=ParagraphStyle("cap",parent=st["small"],alignment=TA_CENTER,spaceBefore=3,spaceAfter=10)
st["cover1"]=ParagraphStyle("cover1",parent=st["body"],fontName=BOLD,fontSize=34,leading=40,textColor=colors.white)
st["cover2"]=ParagraphStyle("cover2",parent=st["body"],fontSize=15,leading=20,textColor=colors.white)
st["cover3"]=ParagraphStyle("cover3",parent=st["body"],fontSize=10.5,leading=14,textColor=colors.white)
st["toc1"]=ParagraphStyle("toc1",parent=st["body"],fontName=BOLD,fontSize=11,leading=16,leftIndent=0)
st["toc2"]=ParagraphStyle("toc2",parent=st["body"],fontSize=9.5,leading=13,leftIndent=16,textColor=INK2)
st["bul"]=ParagraphStyle("bul",parent=st["body"],spaceAfter=2)
st["cell"]=ParagraphStyle("cell",parent=st["body"],fontSize=9,leading=12,spaceAfter=0)
st["cellb"]=ParagraphStyle("cellb",parent=st["cell"],fontName=BOLD)

class Doc(BaseDocTemplate):
    def __init__(self,fn,**kw):
        BaseDocTemplate.__init__(self,fn,pagesize=letter,leftMargin=0.85*inch,rightMargin=0.85*inch,topMargin=0.9*inch,bottomMargin=0.85*inch,title="MyCoreRetail — User Manual",author="MyCoreRetail",**kw)
        body=Frame(self.leftMargin,self.bottomMargin,self.width,self.height,id="body")
        self.addPageTemplates([PageTemplate(id="cover",frames=[Frame(0,0,W,H,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0,id="c")],onPage=self.cover_page),PageTemplate(id="main",frames=[body],onPage=self.main_page)])
        self.chapter=""; self._n1=0; self._n2=0
    def handle_documentBegin(self):
        self.chapter=""; BaseDocTemplate.handle_documentBegin(self)
    def cover_page(self,canv,doc):
        canv.saveState(); canv.setFillColor(TEAL); canv.rect(0,0,W,H,fill=1,stroke=0); canv.setFillColor(MINT); canv.rect(0,H-0.35*inch,W,0.35*inch,fill=1,stroke=0); canv.rect(0,0,W,0.25*inch,fill=1,stroke=0); canv.restoreState()
    def main_page(self,canv,doc):
        canv.saveState(); canv.setStrokeColor(SAGE); canv.setLineWidth(1); canv.line(doc.leftMargin,H-0.65*inch,W-doc.rightMargin,H-0.65*inch)
        canv.setFont(BASE,8.5); canv.setFillColor(INK2); canv.drawString(doc.leftMargin,H-0.55*inch,"MyCoreRetail — User Manual"); canv.drawRightString(W-doc.rightMargin,H-0.55*inch,self.chapter)
        canv.drawCentredString(W/2,0.55*inch,"Page %d"%doc.page); canv.restoreState()
    def afterFlowable(self,fl):
        if isinstance(fl,Paragraph):
            s=fl.style.name; txt=fl.getPlainText()
            if s=="h1":
                self.chapter=txt; key="h1-"+"".join(ch for ch in txt if ch.isalnum())[:40]; self.canv.bookmarkPage(key); self.notify("TOCEntry",(0,txt,self.page,key)); self.canv.addOutlineEntry(txt,key,0,0)
            elif s=="h2":
                key="h2-"+"".join(ch for ch in txt if ch.isalnum())[:40]; self.canv.bookmarkPage(key); self.notify("TOCEntry",(1,txt,self.page,key)); self.canv.addOutlineEntry(txt,key,1,0)

def P(t,s="body"): return Paragraph(t,st[s])
def H1(t): return Paragraph(t,st["h1"])
def H2(t): return Paragraph(t,st["h2"])
def H3(t): return Paragraph(t,st["h3"])
def bullets(items):
    return ListFlowable([ListItem(Paragraph(i,st["bul"]),leftIndent=12,value="•") for i in items],bulletType="bullet",start="•",leftIndent=14,bulletFontName=BASE,bulletFontSize=9,spaceAfter=6)
def steps(items):
    return ListFlowable([ListItem(Paragraph(i,st["bul"]),leftIndent=16) for i in items],bulletType="1",leftIndent=18,bulletFontName=BOLD,bulletFontSize=9.5,bulletColor=TEAL,spaceAfter=6)
def callout(title,text,kind="note"):
    bg={"note":SAGE,"tip":AMBER,"warn":RED}[kind]
    t=Table([[Paragraph("<b>%s</b>  %s"%(title,text),st["cell"])]],colWidths=[W-1.7*inch])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),bg),("BOX",(0,0),(-1,-1),0.5,colors.HexColor("#C9D6CE")),("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    return KeepTogether([t,Spacer(1,8)])
def shot(fn,caption,width=None):
    path=os.path.join(SHOTS,fn)
    if not os.path.exists(path): return Spacer(1,1)
    im=PILImage.open(path); w,h=im.size; maxw=width or (W-1.7*inch); maxh=4.6*inch; sc=min(maxw/w,maxh/h); img=Image(path,width=w*sc,height=h*sc)
    tbl=Table([[img]],colWidths=[w*sc]); tbl.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.75,colors.HexColor("#C9D6CE")),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)])); tbl.hAlign="CENTER"
    return KeepTogether([tbl,Paragraph(caption,st["cap"])])
def table(rows,widths=None,header=True):
    data=[[Paragraph(c,st["cellb"] if header and i==0 else st["cell"]) for c in r] for i,r in enumerate(rows)]
    t=Table(data,colWidths=widths,repeatRows=1 if header else 0)
    sty=[("GRID",(0,0),(-1,-1),0.4,colors.HexColor("#D6E1DA")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]
    if header: sty.append(("BACKGROUND",(0,0),(-1,0),SAGE))
    t.setStyle(TableStyle(sty)); return KeepTogether([t,Spacer(1,8)]) if len(rows)<=6 else [t,Spacer(1,8)]

S=[]
# ---------------- COVER ----------------
S.append(Spacer(1,2.3*inch))
cov=Table([[Paragraph("MyCoreRetail",st["cover1"])],[Paragraph("User Manual",st["cover2"])],[Spacer(1,18)],[Paragraph("Point of sale, inventory, purchasing, fulfillment, delivery routing, warehouse, service and reporting for furniture, mattress and home-goods retailers.",st["cover2"])],[Spacer(1,40)],[Paragraph("Edition: %s"%datetime.date.today().strftime("%B %Y"),st["cover3"])],[Paragraph("Covers the software owner console and the dealer store application.",st["cover3"])]],colWidths=[W-2*inch])
cov.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),1*inch)])); S.append(cov)
S.append(PageBreak())
# ---------------- TOC ----------------
from reportlab.platypus import NextPageTemplate
S.insert(len(S)-1,NextPageTemplate("main"))
S.append(Paragraph("Contents",st["h1toc"]))
toc=TableOfContents(); toc.levelStyles=[st["toc1"],st["toc2"]]; toc.dotsMinLevel=0; S.append(toc); S.append(PageBreak())

# ---------------- 1. WELCOME ----------------
S+= [H1("1. Welcome to MyCoreRetail"),
P("MyCoreRetail runs a furniture, mattress or home-goods store from the first quote to the last delivery. It is built for how these stores actually work: big-ticket sales with deposits and financing, items that ship from a vendor weeks later, deliveries on trucks, pickups from a warehouse, commissions paid when goods go out, and a CPA who needs clean numbers at month end."),
H2("Two doors into the software"),
bullets(["<b>Administration console</b> — the software owner's screen. Create dealers, open any dealer for support, connect vendor catalogs, manage administrators and backups. It has no store data of its own.","<b>Store register</b> — the dealer's application. Each dealer is a completely separate store with its own staff, inventory, customers, sales, settings and look. Nothing crosses between dealers."]),
shot("24_store_signin.png","The store register sign-in: tap your name, enter your PIN."),
H2("The flow of a sale, end to end"),
table([["Step","Where","What happens"],["1. Sell","New sale","Customer, items, fulfillment (take today / hold for pickup / delivery), payment terms, payment."],["2. Order from suppliers","Inventory → Purchase orders","Anything not in stock becomes a customer-order line; one click makes POs per supplier."],["3. Receive","Purchase orders → Receive items","Stock goes up, customer orders flip to Ready, vendor invoice is recorded, labels print."],["4. Pick & stage","Warehouse (optional)","Pull the order by bin, scan to pick, stage it for the truck or will-call."],["5. Schedule & route","Deliveries & pickups","Calendar shows capacity; route day optimizes stops per truck with ETAs."],["6. Deliver or hand over","Crew view / Pickups","Signature, photos, balance collected; partial deliveries create the follow-on automatically."],["7. Get paid & report","Reports","Payments, sales tax, COGS, commissions (paid when delivered and paid in full)."]],widths=[1.3*inch,1.7*inch,3.8*inch]),
callout("Language used in this manual","“Order from supplier” (older screens may say “special order”) means an item the store must buy from a vendor for a specific customer. “Fulfillment” means how the customer gets the goods: takes it today, hold for pickup, or home delivery.","note"),
PageBreak()]

# ---------------- 2. GETTING STARTED ----------------
S+= [H1("2. Getting started"),
H2("2.1 Software owner setup"),
steps(["Open the app. The first screen is <b>Create your administrator login</b>. Enter the software name (MyCoreRetail), your name and a 4–8 digit PIN.","You land in the Administration console. Your device is now remembered as the administrator's console."]),
H2("2.2 Creating a dealer"),
steps(["Dealers → <b>Add dealer</b>. Enter the store name, contact details, tax rate, address and the first manager's name and PIN. Tick <i>Load sample data</i> if you want a demo store to explore.","The dealer gets a store code (e.g. NFM01). Open <b>More → Sign-in link &amp; instructions</b> to copy or email the link the dealer opens on each register, tablet or phone.","<b>Open</b> starts a support session inside the dealer's store; <b>Back to admin console</b> (account menu ⋯) returns you."]),
shot("01_admin_dealers.png","Administration console — dealers, support sessions, vendor integrations."),
H2("2.3 Store devices and sign-in"),
bullets(["A device that opens the dealer's link becomes that store's register and remembers the store — staff only ever see their own store's sign-in.","Tap your name, enter your PIN. Managers add staff under Settings → Staff &amp; permissions.","<b>Idle lock</b>: the register locks after a few minutes without a touch (Settings → Pricing → Shared register security). An unfinished sale is restored when someone signs back in.","<b>Switch user</b>: account menu (⋯ at the bottom of the sidebar) → Lock register / switch user.","The account menu also holds Clock in / out (when the Time clock feature is on), dark mode and, in a support session, Back to admin."]),
H2("2.4 Branding"),
bullets(["Settings → Store &amp; tax → upload the logo; it appears in the sidebar, on the register, sign-in, invoices, slips, tags and labels (Logo placement controls each).","Store colors: pick one of 16 recommended themes or enter custom brand colors; every screen and the sign-in follow it."]),
shot("02_dashboard.png","Home — today's numbers, needs-attention list, delayed items, deliveries."),
PageBreak()]

# ---------------- 3. SETTINGS ----------------
S+= [H1("3. Settings, tab by tab"),
P("Everything a store can change lives in Settings. Managers (or anyone with the Settings permission) can edit them. Most lists are <b>bubbles</b>: type a value, press Enter or Add, click ✕ to remove."),
H2("3.1 Store &amp; tax"),
bullets(["Store name, phone, address and <b>map pin</b> (paste coordinates or a Google Maps link) — the pin drives routing and delivery pricing.","<b>Tax brackets</b>: name each rate (state + county, city, out of state…), set the default with the radio button. The register opens on the default; customers can be pinned to a bracket, marked exempt, or given a custom rate.","<b>“How did you hear about us?”</b> choices (required on every customer).","<b>Address suggestions</b>: default city/state/ZIP and a street list for your area so addresses complete themselves.","Store colors, logo and logo placement."]),
H2("3.2 Delivery &amp; routing"),
bullets(["Departure time, average speed (mph), minutes per stop, setup/haul-away extras.","<b>Calendar capacity</b>: max stops per truck per day and the days you deliver.","<b>ETA alerts</b>: how many days before an expected date to raise a flag.","<b>Delivery price matrix</b>: rows are order-subtotal bands, columns are road miles from the store; plus delivery options (white-glove +$50, curbside −$20) that adjust the matrix fee.","Trucks &amp; crews (capacity in pieces, crew names) are managed from Deliveries → More."]),
H2("3.3 Mattress &amp; returns"),
bullets(["Sleep-trial nights, comfort-exchange fee, whether a protector is required for the trial, restocking %, floor-sample days and markdown %.","Mattress sizes, comfort levels and types (bubbles) used on the item form."]),
H2("3.4 Pricing &amp; financing"),
bullets(["<b>Landed cost &amp; automatic pricing</b> — per supplier: freight %, extra cost %, surcharge, multiplier, rounding and cents. “Store default” only covers items with no supplier. An at-a-glance table compares every supplier.","Multiplier by category, standard colors and finishes, categories &amp; sub-categories.","<b>Payment methods</b> and <b>card brands</b> offered at the register.","<b>Lease-to-own &amp; financing companies</b> with the “charges tax up front” rule, merchant fee and default term.","<b>Card processing &amp; terminals</b>: the card panel (last 4 required), verification and same-day pickup alerts, terminals, surcharge, and the relay URL for integrated processing.","<b>Protection plans</b>: % of subtotal, min/max, rounding, plan cost %, plan commission %.","Low-margin warning, discount limit, quote validity, <i>require customer details</i>, <i>hold goods until paid in full</i>.","<b>Label printer</b> (Zebra connection, stock size, dpi, logo on labels) and <b>shared register security</b> (idle lock, salesperson PIN)."]),
H2("3.5 Staff &amp; permissions"),
P("Roles set the defaults; open a person to fine-tune every screen and action, their discount and margin limits, commission rate and plan rate. See chapter 12."),
H2("3.6 Optional features"),
P("Promotions, multiple locations &amp; transfers (warehouse / showroom), ups &amp; close rate, physical stock counts, inventory analysis &amp; scorecards, accounting export, time clock, warehouse picking &amp; storage. Turn on only what the store uses."),
shot("22_features.png","Optional features — each dealer switches on what it needs."),
H2("3.7 Data &amp; backup"),
P("Export a full backup, import, or reset sample data. The administrator can also export any dealer from the console."),
PageBreak()]

# ---------------- 4. INVENTORY ----------------
S+= [H1("4. Inventory"),
P("Inventory (also called stock or items) holds everything you sell: items, kits, packages, suppliers, purchase orders, price tags, promotions and stock counts."),
shot("12_inventory.png","Inventory → Items: photos, SKU/model, category and collection, landed cost, price, margin, stock."),
H2("4.1 Adding an item"),
bullets(["<b>Identity</b>: SKU/barcode (Auto generates one), model #, collection, name, category → sub-category, supplier, color, cover/finish, size, dimensions, photo, vendor item #, bin.","<b>Mattress fields</b> appear for the Mattress category: comfort, type, sleep trial.","<b>Cost &amp; price</b>: vendor cost, freight (blank = supplier's %), extra cost %, surcharge, landed cost (calculated), multiplier, selling price (auto unless <i>manual</i>), MSRP, MAP.","<b>Stock</b>: on hand (per location when locations are on), reorder point, pieces per unit (used for box counts and truck loading), warranty years.","<b>Flags</b>: floor sample; <i>this is a kit</i> (components); matching pieces for “goes with this”."]),
shot("16_item_form.png","The item form."),
H2("4.2 Landed cost and automatic pricing"),
P("<b>Landed cost = vendor cost + freight + extra cost % + surcharge.</b> <b>Selling price = landed cost × multiplier</b>, rounded (up/down/nearest, whole dollars or .99/.95), never below the vendor's MAP."),
P("Rules stack, most specific wins: a value typed on the item → the supplier's rule → the category multiplier → the store default. Change a supplier's rules under Settings → Pricing and use <i>Re-price items</i> to push the change through its catalog. Margins everywhere use landed cost."),
H2("4.3 Suppliers"),
P("Inventory → Suppliers: contact, account #, lead time, payment terms, minimum order, and the supplier's own cost rules. Suppliers can carry a catalog feed (JSON/CSV) and, when the software owner has connected a vendor integration, a platform catalog you pull from at your own markup."),
shot("15_suppliers.png","Suppliers with their freight, extras and multiplier side by side."),
H2("4.4 Kits and packages"),
bullets(["<b>Kit</b> = one SKU built from other SKUs (King bed = headboard + footboard + rails). Kit stock is what you can build; selling the kit takes the components out of stock; cost and price roll up from the pieces.","<b>Package</b> = a bundle sold at one price (Alder 5-piece bedroom). Build it under Inventory → Packages (kits can be inside). At the register <i>Add package</i> drops it in as a group; add or remove pieces freely."]),
H2("4.5 Locations, showroom and floor models"),
P("With <i>Multiple locations</i> on, stock is tracked per location (Warehouse, Showroom, more). A location marked <b>display floor</b> holds floor models: the catalog says “4 deliverable · 1 on the floor”, only warehouse stock counts as deliverable, and the register asks you to mark a line Floor sample before selling the floor unit. Transfers move pieces with a printable sheet."),
H2("4.6 Uploading inventory from a spreadsheet"),
steps(["Inventory → More → <b>Download CSV template</b> and fill it (or export your existing sheet as CSV).","More → <b>Upload inventory (CSV)</b> → choose the file.","<b>Match columns</b>: every field shows the column it will read; fix any guess. SKU and name are required.","<b>Preview &amp; validate</b>: new vs updated, rows that will be skipped and why, categories or suppliers that will be created.","<b>Import</b>. Prices in the file are kept as manual; blank prices are auto-priced from landed cost."]),
H2("4.7 Labels and price tags"),
bullets(["<b>Labels</b> (warehouse, scannable Code 128 SKU barcode, logo): item rows → Label; tick rows → Labels (n); More → Print labels…; purchase orders and invoices have their own Labels buttons.","<b>Price tags</b>: Inventory → Price tags (shelf, hang tag, mattress card, small barcode) or tick catalog cards → Print tags.","Zebra printers: see chapter 13."]),
H2("4.8 Promotions and stock counts (optional)"),
bullets(["Promotions: date-ranged % or $ off, store-wide, by category or by item; applied at the register and on tags; never below MAP.","Stock counts: blind or open counts by category/location, variance review with cost impact, apply adjustments."]),
H2("4.9 Catalog"),
P("A browsable, picture-first view of everything with tabs for Items, Kits and Packages, filters by category/sub-category/collection and search. Tap a card for details, spec sheet, tag or label; <b>Add</b> builds a sale and <b>Open sale</b> takes it to the register."),
shot("05_catalog.png","Catalog — browse, quick view, add to sale."),
PageBreak()]

# ---------------- 5. SELLING ----------------
S+= [H1("5. Selling at the register"),
shot("03_register.png","New sale — items on the left, totals and payment on the right."),
H2("5.1 Step by step"),
steps(["<b>Customer</b> (required): choose or + New. First/last name (or a company name), phone, address and “how did they hear about us?” are mandatory. A customer without a referral shows a dropdown right under the customer.","<b>Salesperson</b>: defaults to you. <b>Split</b> shares the deal between people or with the House by percentage.","<b>Items</b>: type a SKU, name or size; scan a tag; or use Add package. “Goes with this” suggests matching pieces from the same collection/model. Add a charge: setup, haul-away, protection plan, deposit, custom.","<b>Per line</b>: quantity, price, order-from-supplier ↔ treat as in stock, Floor sample, As-is, who pays (lease/finance company or customer).","<b>Discount</b> (% or $), package pricing (tick lines → Group as package), tax bracket.","<b>Fulfillment</b> (required): Customer takes it today · Hold for pickup later (planned date) · Home delivery (option and fee from the matrix).","<b>Payment terms</b>: Pay now, Financing, Lease-to-own, Layaway.","<b>Payment now</b>: card (card panel), cash (shows change), check, gift card, store credit, the lease/finance company's tender, or any tender you've added.","<b>Complete sale</b> → invoice prints. Save quote keeps it as a quote with an expiry and follow-up."]),
H2("5.2 Fulfillment choices"),
table([["Choice","Use when","What the app does"],["Customer takes it today","They leave with in-stock goods","Lines are marked delivered now; anything not in stock is held for pickup when it arrives."],["Hold for pickup later","In stock but collecting later, or ordered goods","Creates a pickup on the Pickups tab: Awaiting stock → Ready → Picked up. Planned date + reminder."],["Home delivery","You deliver","Creates a delivery: Awaiting stock → To schedule → Scheduled → Loaded → Out → Delivered."]],widths=[1.5*inch,1.9*inch,3.4*inch]),
H2("5.3 Margin viewer"),
P("Double-tap the Sale title (or press M). Staff with “see margin” see the margin % on the sale, the store target and their commission — no dollars of cost. Managers and anyone with “see costs” get the full panel: landed cost, gross profit, financing fee and the lowest price that still hits target. Margin is calculated on merchandise only; plans and services are shown separately."),
H2("5.4 Approvals and limits"),
bullets(["Discounts over the person's limit, prices below their limit, package prices under limit, completing with a balance, out-of-policy returns and price changes for staff who can't edit prices all ask for an approver's PIN.","A minimum-margin floor per person blocks the sale below that margin without approval.","Vendor MAP is a hard floor for prices, promotions and tags."]),
H2("5.5 Card payments"),
P("Choosing <b>Card</b> opens the card panel. Manual card machine: card type and the <b>last 4 digits (required)</b>, name on card, optional auth/reference. A reminder tells the seller to verify the name on the card matches the invoice and to check ID; for same-day pickups a red caution describes the “rental truck outside” fraud pattern. With an integrated terminal (relay connected) the panel charges the terminal and fills everything in."),
shot("04_card_panel.png","Card panel with verification reminder and required last 4."),
H2("5.6 Financing, lease-to-own and mixed tickets"),
P("Pick the company under Payment terms; every product line gets a <b>who-pays</b> tag. A company that doesn't charge tax up front gets no tax on its items (the lessor remits it); the customer's own items and up-front-taxed companies are taxed. Several companies can be on one ticket; the summary lists each company's amount, tax and fee, then the customer's portion; Payment now offers one tender per company. The invoice prints each company's items and a “Paid by …” line."),
H2("5.7 Protection plans, services, floor samples, as-is"),
bullets(["<b>Protection plan</b>: auto-priced at 10% of merchandise (rounded to $…49/$…99, min $149, max $999 — all adjustable). Editable by anyone. Kept out of gross margin; pays its own commission rate with an optional incentive.","<b>Services</b> (setup, haul-away, custom charges) are reported separately and excluded from margin.","<b>Floor sample</b> offers the floor-sample markdown; <b>As-is</b> prints “all sales final, no warranty” and an acknowledgment/signature block. Both can be on the same line."]),
H2("5.8 Layaway and quotes"),
bullets(["Layaway takes a deposit and a schedule; goods are held until paid in full and all ordered items are received; payment follow-ups are created.","Quotes save the ticket with a valid-until date and a follow-up; convert to a sale later."]),
H2("5.9 Invoices, returns and voids"),
bullets(["Invoices list: search, filter, fulfillment column. Open one for the tracker (Sold → Stock ready → Scheduled/Pickup planned → Delivered/Picked up), lines, payments, labels, print/email/text.","<b>Return / exchange</b>: restocking or comfort-exchange fee, refund to original payment, store credit or exchange credit (opens a new sale). Returned used items become floor samples; commissions charge back in the return month.","<b>Void</b> returns stock and cancels deliveries (permission required)."]),
shot("07_invoice.png","An invoice with the fulfillment tracker and a partially delivered order."),
PageBreak()]

# ---------------- 6. ORDERS & FULFILLMENT ----------------
S+= [H1("6. Orders and fulfillment"),
P("The <b>Orders</b> board (Sell section) shows every open order with its live status and the next action. Tabs filter by state; rows sort so the nearest ETAs are on top."),
shot("06_orders.png","Orders board — status, outstanding items with ETAs, next action."),
H2("6.1 Statuses you will see"),
table([["Status","Meaning"],["Awaiting stock · ETA Oct 1","At least one item must come from a supplier; ETA shown when set."],["Ready for pickup · Sep 19","Everything is in; customer notified/planned date shown."],["To schedule / Scheduled Sep 18 / Loaded / Out for delivery","Delivery lifecycle."],["Partially delivered · rest to schedule","Some items went out; a follow-on delivery holds the rest."],["Partially picked up · rest awaiting stock · ETA …","Some items collected; the rest waits for the vendor."],["Delivered Sep 18 / Picked up Sep 20 / Taken at sale","Complete."],["Held — layaway","Released when paid off."]],widths=[2.6*inch,4.2*inch]),
H2("6.2 The pickup process"),
steps(["Sale set to <i>Hold for pickup</i> (or ordered goods on a take-today sale) appears on Deliveries &amp; pickups → <b>Pickups</b>.","Receiving the supplier's PO flips it to <b>Ready</b> and creates a “Ready for pickup” follow-up.","<b>Text ready</b> messages the customer and records it; <b>Date</b> sets a planned pickup (reminder the day before).","<b>Pick up</b>: checklist of items (partial allowed), collect any balance, who picked up, ID/vehicle note, signature, printed pickup slip. Partial pickups keep the rest on the list.","<b>Hold tags / labels</b> mark the goods in the warehouse with the customer, invoice and date."]),
shot("10_pickups.png","Pickups tab."),
H2("6.3 The delivery process"),
steps(["Sale set to <i>Home delivery</i> creates a delivery: <b>Awaiting stock</b> until ordered items arrive (and layaways are paid), then <b>To schedule</b>.","Schedule: date (with live capacity), window, truck. The Calendar shows how full every day is.","Route day: optimize, confirm windows by text, print pick list / slips / route sheets / labels.","Crew completes the stop (chapter 8); partial deliveries create a follow-on delivery for the remaining items and open the ETA box."]),
H2("6.4 ETAs and delayed items"),
bullets(["<b>Set ETA / notify</b> on any order with outstanding items: expected date and reason per item, plus a one-tap delay text to the customer. Saving an ETA also creates an “ETA check” follow-up before the date.","Home shows <i>Delayed items — priority</i>: arrived but not scheduled, ETA passed, ETA due within N days, no ETA."]),
H2("6.5 Hold until paid in full"),
P("With the setting on (default), pickups can't be completed and stops can't be loaded, marked arrived or completed while the invoice has a balance. Collecting the balance in the pickup window or on delivery releases it; a manager can release with confirmation/PIN and the release is recorded."),
PageBreak()]

# ---------------- 7. PURCHASING ----------------
S+= [H1("7. Purchasing and receiving"),
shot("13_purchasing.png","Purchase orders — needs-ordering panel, search, age colors, vendor bills."),
H2("7.1 Needs ordering"),
P("The panel at the top lists customer-order lines not yet on a PO and any <b>oversold</b> items (sold as in-stock but stock went negative). <b>Create POs for them</b> makes one PO per supplier, linked to each customer's invoice so arrival releases their delivery or pickup. Reorder suggestions cover stock at or below reorder point (deliverable stock, so floor models don't hide a stock-out)."),
H2("7.2 The PO lifecycle"),
table([["Step","How"],["Draft","Add lines (search or Reorder suggestions); edit expected date and notes."],["Ordered","<b>Mark as ordered</b>: order date, vendor confirmation #, expected arrival, how it was placed. Special-order customers' ETAs update. Vendor integrations can send the order in the vendor's format."],["Age colors","Green ≤5 days since ordered, yellow 6–10, red over 10 — chase the vendor. Overdue expected dates are flagged in red and on Home."],["Received","<b>Receive items</b>: per-line quantities (partial receipts allowed), stock and locations update, customer items flip to arrived, labels print, receiving is stamped with date and person."],["Vendor invoice / bill","Enter the vendor's invoice #, date, amount (flagged if it differs from the PO), due date, freight, paid on/how. The <b>Vendor bills to pay</b> tab lists unpaid bills."]],widths=[1.4*inch,5.4*inch]),
shot("14_po.png","A purchase order with the tracker and vendor invoice panel."),
H2("7.3 Search"),
P("Search purchase orders by PO number, item, customer, customer invoice, supplier, confirmation # or vendor invoice #."),
H2("7.4 Supplier catalogs and vendor integrations"),
P("A supplier can import a JSON/CSV catalog feed with field mapping. When the software owner connects a vendor integration (Administration → Vendor integrations), dealers see it under Suppliers, connect it at their own multiplier, pull the whole catalog or browse and add single items, and get “catalog updated” prompts with cost changes. Purchase orders to that supplier can be sent in the vendor's order format."),
PageBreak()]

# ---------------- 8. DELIVERIES ----------------
S+= [H1("8. Deliveries, routing and the crew"),
H2("8.1 Calendar and capacity"),
P("Deliveries &amp; pickups opens on the Calendar: each day shows stops booked, pieces, and a fill bar against capacity (trucks × max stops, and truck piece capacity). Days you don't deliver are greyed. Tap a day to open its routes. When scheduling, the date field shows live availability."),
shot("08_calendar.png","Delivery calendar with capacity bars."),
H2("8.2 Scheduling and routing"),
steps(["<b>To schedule</b> tab: set date, window and truck for each unscheduled delivery (follow-ons from partial deliveries are tagged “remaining items”).","<b>Route day</b>: <b>Optimize routes</b> balances stops across trucks by pieces and orders them by time window and road miles; ETAs are computed per stop.","<b>Print</b>: pick list (with location · bin), delivery slips (balance to collect, trial note), route sheets, piece labels; export the route CSV.","<b>Confirm windows by text</b> pre-fills a message with each ETA. <b>Open in Google Maps</b> hands the ordered route to the driver's phone."]),
shot("09_route_day.png","Route day — one card per truck with map, ETAs and stop actions."),
H2("8.3 Loading rules"),
P("<b>All loaded</b> / <b>Truck departed</b> skip stops whose invoice still has a balance (paid-in-full rule) and tell you which ones. Stops show a red hold tag. Managers can release."),
H2("8.4 Crew view (phone)"),
P("Crew opens the day's stops as cards: Navigate, Call, Text “on our way” (with ETA), Arrived, Complete stop, Can't deliver."),
bullets(["<b>Complete stop</b>: item checklist (untick anything not delivered), haul-away and setup done, collect balance, received by, issues/damage, signature pad, up to two photos. Delivered items are stamped per line, so commissions and partial deliveries are exact.","<b>Can't deliver</b>: reason, reschedule, follow-up created.","A partial stop creates the follow-on delivery for the remaining items and opens the ETA box so the customer can be told."]),
shot("23_crew_mobile.png","Crew view on a phone.",width=2.4*inch),
H2("8.5 Delivery pricing at the register"),
P("The delivery option dropdown shows the matrix fee for the customer's distance and order size with the reason (“12 mi · within 25 mi · order $2,000+”); staff can override the fee, and “use quoted fee” snaps it back."),
PageBreak()]

# ---------------- 9. WAREHOUSE ----------------
S+= [H1("9. Warehouse (optional module)"),
P("For stores with a real warehouse. Turn on Settings → Optional features → Warehouse picking &amp; storage; <b>Warehouse</b> appears under Operate."),
shot("11_warehouse.png","Pick &amp; stage — the pull list for a day, with bins, piece counts and scan-to-pick."),
table([["Tab","What it does"],["Pick &amp; stage","Pull list for a date: every scheduled stop and ready pickup, item by item with location · bin, qty · pieces, hold flags. Tick or scan the SKU to pick; when an order is fully picked choose a staging area and it moves to “Staged — ready to load / hand over”. Print pick list, labels for the day."],["Put-away","Everything received (and anything on hand with no bin) with a quick “put away in…” box."],["Storage bins","Bubble editors for bins/zones and staging areas; what's in each bin with units and value."],["Find an item","Scan or type a SKU, name or bin: where it is, on hand, committed to customer orders; print a label."]],widths=[1.3*inch,5.5*inch]),
PageBreak()]

# ---------------- 10. SERVICE ----------------
S+= [H1("10. Service"),
shot("17_service.png","Service — follow-ups, sleep trials, returns, warranty claims."),
bullets(["<b>Follow-ups</b> are created automatically: delivery check-in (+3 days), review request (+14), sleep trial ending, layaway payments, special orders arrived, ready for pickup, pickup reminders, quotes (+2), ETA checks, delivery issues. Open/snooze/done with call, text and email drafts; add manual ones.","<b>Sleep trials</b>: every active trial with its end date, protector attach and a comfort-exchange button; the exchange checks the trial window and protector policy.","<b>Returns &amp; exchanges</b>: from the invoice or here; fees, refund method, restocking, chargebacks.","<b>Warranty claims</b>: item, issue, vendor, warranty check, status log, vendor email draft, ring a replacement at $0. As-is items warn before opening a claim."]),
PageBreak()]

# ---------------- 11. REPORTS ----------------
S+= [H1("11. Reports"),
shot("18_analytics.png","Sales analytics — periods, comparisons, charts, employee performance."),
table([["Tab","What you get"],["Sales analytics","Today/week/month/quarter/year/30/90 days/12 months or any range, grouped by day/week/month, compared with the prior period. KPIs, sales over time, by employee, by day of week, by hour, this year vs last, employee performance table with per-period columns, where customers came from. CSV export, print."],["Top sellers","Items, collections, categories or sub-categories by quantity or revenue with bar chart and category pie; a specific item's trend by day/week/month."],["Payments","Daily collections by tender, how customers paid (and by card brand), what the money was for, card batch reconciliation against terminal totals, payment detail with terminal/approval, cash-count sign-off print."],["Tax &amp; accounting","Sales tax: taxable vs non-taxable, lease-to-own items per company (lessor remits), tax-exempt customers, zero-rate brackets, by bracket, refunds, net tax due; revenue &amp; COGS (sale-date or delivery-date basis), gross profit, total gross revenue; inventory position on hand / showroom / committed / available / on order. Exports and a printable accounting pack."],["Operations &amp; Z report","Net sales, gross profit on merchandise, plans &amp; services, payment methods, category mix, mattress mix &amp; attach rates, on-time delivery, floor-sample aging, returns; Z report with cash count and accounting export."],["Commissions","See 11.1."],["Inventory &amp; team / Hours","Optional: turns, GMROI, dead stock, team scorecard, vendor performance, stock by location; time-clock hours and timesheets."]],widths=[1.5*inch,5.3*inch]),
H2("11.1 Commissions"),
shot("20_commissions.png","Commission report."),
bullets(["<b>Basis</b> (selector on the report): counts when delivered/picked up <i>and</i> paid in full (recommended), when delivered/picked up, or on the sale date. A sale from July completed in September pays in September; partial deliveries pay line by line; returns charge back in the return month.","Presets: today, week, month, last month, quarter, year, or any range. A note shows how many earlier sales completed in the period.","<b>Earned</b> (merchandise) and <b>Plans</b> (protection plans at their own rate + incentive) are shown separately; Due adds them. Split deals pay each person their share.","Commission rules: basis, paid-in-full, services commissionable, plan base rate, incentive % and flat $, attach-rate goal. Pipeline column shows undelivered sold lines and pending commission."]),
shot("19_accounting.png","Tax &amp; accounting — built for the CPA."),
PageBreak()]

# ---------------- 12. STAFF & PERMISSIONS ----------------
S+= [H1("12. Staff, permissions and security"),
shot("21_staff.png","Staff &amp; permissions."),
bullets(["<b>Roles</b> (manager, sales associate, cashier, delivery driver) set the defaults. Each person has a full checklist: screens (sales, catalog, orders, invoices, customers, service, inventory, purchasing, suppliers, tags, packages, deliveries, crew, warehouse, reports, commissions own/all, settings, manage staff), on a sale (see margin %, see costs, change prices, give discounts, complete with balance, quotes) and actions (void, returns, adjust stock, approve overrides with PIN).","<b>Limits</b>: max discount without approval, minimum margin they may sell at.","<b>Commission</b>: rate on sales or margin, protection-plan rate.","<b>Shared register</b>: idle lock; salesperson PIN when the sale is credited to someone other than the signed-in user (recorded as “rung up by”).","<b>Cost visibility</b>: cost figures appear only for people with “see costs” — inventory, catalog, packages, reports and the margin viewer all respect it."]),
PageBreak()]

# ---------------- 13. PRINTING ----------------
S+= [H1("13. Printing, labels and Zebra printers"),
H2("13.1 How printing works"),
P("Print opens the document in its own browser tab, which brings up the print dialog (the app itself runs in a protected frame that browsers won't print from). If pop-ups are blocked, a preview appears with Print, Open in new tab and Download. Documents: invoices, receipts, quotes, pickup slips, delivery slips, pick lists, route sheets, hold tags, labels, price tags, POs, transfer sheets, count sheets, reports, timesheets."),
H2("13.2 Labels"),
bullets(["Stock labels: item, SKU/vendor #/model, color/finish/size, bin, price, Code 128 barcode.","Customer/delivery labels: logo, <b>BOX n OF N</b> (every piece across the order), customer, invoice, phone, delivery date/window/truck or pickup date, item and “piece 2 of 3”, barcode.","Where: item rows, inventory selection, catalog selection, purchase orders (ordered/received), invoices, route day, warehouse, Settings → Test label."]),
H2("13.3 Zebra setup"),
table([["Connection","Setup"],["Installed driver","Install the Zebra driver, set the label size in Printing preferences → Page setup to match the stock chosen in the app, pick the Zebra in the print dialog with margins none."],["Zebra Browser Print","Install Zebra Browser Print on the register, add the printer, enter its name in Settings → Label printer. “Send to Zebra” goes straight to it; if the local agent can't be reached the ZPL downloads instead."],["Network Zebra","Download the ZPL file and drop it on the printer's share, or send with Zebra Setup Utilities."]],widths=[1.6*inch,5.2*inch]),
P("Label stock: 2.25×1.25, 3×2, 4×2 (recommended), 4×3, 4×6, or a 6-up letter sheet; 203 or 300 dpi; logo on 3×2 and larger."),
PageBreak()]

# ---------------- 14. ADMIN ----------------
S+= [H1("14. Administration console (software owner)"),
bullets(["<b>Dealers</b>: add, edit, suspend/reactivate, open (support session), reset PIN, sign-in link &amp; instructions, usage summary, export backup, delete (type the code).","<b>Vendor integrations</b>: enter a vendor's API details once (base URL, key, paths, format, field mapping, order template), load its catalog (fetch or paste), assign to all or specific dealers, pause. Dealers pull items at their own rules and send POs in the vendor's format.","<b>Administrators</b>: additional owner logins with PINs.","<b>Software settings</b>: software name, support contact, platform backup, restore into a new dealer."]),
callout("What needs an outside service","Live vendor API sync, Google-style address lookup and integrated card terminals all require the app to reach outside services, which the hosting platform does not allow directly. The settings and workflows are in place; a small relay service hosted elsewhere unlocks them.","tip"),
PageBreak()]

# ---------------- 15. TROUBLESHOOTING ----------------
S+= [H1("15. Troubleshooting &amp; FAQ"),
table([["Question","Answer"],["A new setting or screen doesn't appear.","Refresh the page (or close and reopen) so the device loads the latest version."],["The card panel didn't open.","Settings → Pricing → Card processing: the panel switch must be on (it is by default). Choose Card, then Add."],["Nothing prints.","Allow pop-ups for the app, or use the preview's Open in new tab / Download."],["An item sold but never reached purchasing.","It was switched to “treat as in stock”. Check Purchase orders → Needs ordering (oversold items) and Reorder suggestions."],["Commission for a sale isn't showing this month.","Check the basis on the report: it counts when delivered/picked up (and paid in full). Undelivered lines sit in the pipeline column."],["The register says the customer is missing details.","Name (or company), phone, address and “how did they hear about us?” are required; the dropdown for the last one is under the customer on the register."],["A pickup can't be completed.","The invoice has a balance and “hold goods until paid in full” is on. Collect the balance in the pickup window or have a manager release."],["Floor model shows as special order.","Only warehouse stock is deliverable. Mark the line Floor sample to sell the showroom unit."],["Where is the time clock?","Optional feature. Once on, staff clock in from the account menu (⋯); Reports → Hours."],["Can I use my own colors / logo?","Settings → Store &amp; tax → Store colors (16 themes or custom) and Logo placement."]],widths=[2.3*inch,4.5*inch]),
H2("Appendix A — Glossary"),
table([["Term","Meaning"],["Landed cost","Vendor cost + freight + extras + surcharge; the cost used for margins and inventory value."],["MAP","Vendor's minimum advertised price; a hard floor for prices, promotions and tags."],["Order from supplier","A line the store must buy from a vendor for this customer (formerly “special order”)."],["Fulfillment","Takes it today, hold for pickup, or home delivery."],["Follow-on delivery","The automatic second delivery created for items not delivered on a partial stop."],["Attach rate","Share of merchandise sales that included a plan (or protector/base for mattresses)."],["Deliverable stock","Stock in non-display locations; floor models are excluded."],["Staged","Picked and placed in a staging area, ready to load or hand over."]],widths=[1.6*inch,5.2*inch]),
H2("Appendix B — Shortcuts and scanning"),
bullets(["Register: press Enter in the item box to add the first match; M toggles the margin viewer; double-tap the title does the same.","USB barcode scanners work anywhere an item search box is focused; the camera scanner (Scan button) reads tags on phones and tablets.","Warehouse: scan a SKU into the pick box to mark it picked."]),
]

flat=[]
for x in S:
    if isinstance(x,list): flat.extend(x)
    else: flat.append(x)
S=flat
doc=Doc("/mnt/user-data/outputs/MyCoreRetail-User-Manual.pdf")
doc.multiBuild(S)
print("built")
