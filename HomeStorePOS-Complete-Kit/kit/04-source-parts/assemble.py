import sys
parts=['p1_head.html','p2_core.js','p3_stock.js','p4_sell.js','p6_admin.js','p7_features.js','p8_integrations.js','p9_fulfillment.js','p10_catalog.js','p11_orders.js','p12_theme.js','p13_reports.js','p14_payments.js','p15_topsellers.js','p16_funding.js','p17_address.js','p18_release.js','p19_cards.js','p20_accounting.js','p21_import.js','p22_warehouse.js','p23_terms.js','p24_home.js','p25_offline.js','p26_security.js','p27_training.js','p28_i18n.js','p29_brand.js','p30_deploy.js','p31_parts.js','p32_esign.js','p33_damaged.js','p5_ops.js']
import os
h="".join(open('/home/claude/pos/'+p).read() for p in parts if os.path.exists('/home/claude/pos/'+p))
open('/mnt/user-data/outputs/furniture-pos.html','w').write(h); print("assembled", [p for p in parts if not os.path.exists('/home/claude/pos/'+p)])
