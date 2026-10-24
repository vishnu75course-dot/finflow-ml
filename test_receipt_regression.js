import { parseReceiptOCR } from './src/utils/nlpParser.ts';

console.log('====================================================');
console.log('   FINFLOW AI - OCR RECEIPT PARSER REGRESSION SUITE   ');
console.log('====================================================\n');

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
  }
}

// -----------------------------------------------------------------------------
// Test 1: Actual Target Receipt (Paneer, Biryani, Roti, Jamun, CGST/SGST, TOTAL 3514.50)
// -----------------------------------------------------------------------------
const test1Receipt = `
Invoice #: 1304
Date 24/04/2024
DESCRIPTION QTY RATE AMOUNT
Paneer Butter Masala 1 180.00 180.00
Veg Biryani 1 3150.00 150.00
Tandoori Roti 3 320.00 60.00
Gulab Jamun 2 100.00 100.00
CGST@ 2.5% 312.25
SGST @ 2.5% 312.25
TOTAL 3514.50
`;
const r1 = parseReceiptOCR(test1Receipt);
assert(r1.amount === 514.5, `Test 1: Extracted amount should be 514.50 (got ${r1.amount})`);
assert(r1.title === 'Food - Invoice #1304', `Test 1: Title should be Food - Invoice #1304 (got ${r1.title})`);
assert(r1.category === 'Food', `Test 1: Category should be Food (got ${r1.category})`);
assert(r1.date === '2024-04-24', `Test 1: Date should be 2024-04-24 (got ${r1.date})`);
assert(typeof r1.amount === 'number', `Test 1: Amount must be a pure number, not string/concatenated`);

// -----------------------------------------------------------------------------
// Test 2: Variation: TOTAL with explicit ₹ symbol and decimals (TOTAL ₹514.50)
// -----------------------------------------------------------------------------
const test2Receipt = `
Restaurant Food Bill
Invoice #: 1304
Date: 24/04/2024
TOTAL ₹514.50
`;
const r2 = parseReceiptOCR(test2Receipt);
assert(r2.amount === 514.5, `Test 2: Variation TOTAL ₹514.50 should extract 514.5 (got ${r2.amount})`);

// -----------------------------------------------------------------------------
// Test 3: Variation: TOTAL without currency symbol (TOTAL 514.50)
// -----------------------------------------------------------------------------
const test3Receipt = `
Invoice #: 1304
Date: 24/04/2024
TOTAL 514.50
`;
const r3 = parseReceiptOCR(test3Receipt);
assert(r3.amount === 514.5, `Test 3: Variation TOTAL 514.50 should extract 514.5 (got ${r3.amount})`);

// -----------------------------------------------------------------------------
// Test 4: Variation: Multi-line TOTAL (TOTAL on one line, ₹514.50 on the next line)
// -----------------------------------------------------------------------------
const test4Receipt = `
Invoice #: 1304
Date: 24/04/2024
TOTAL
₹514.50
`;
const r4 = parseReceiptOCR(test4Receipt);
assert(r4.amount === 514.5, `Test 4: Multi-line TOTAL \\n ₹514.50 should extract 514.5 (got ${r4.amount})`);

// -----------------------------------------------------------------------------
// Test 5: Variation: Multi-line TOTAL without symbol (TOTAL on line 1, 514.50 on line 2)
// -----------------------------------------------------------------------------
const test5Receipt = `
Invoice #: 1304
Date: 24/04/2024
TOTAL
514.50
`;
const r5 = parseReceiptOCR(test5Receipt);
assert(r5.amount === 514.5, `Test 5: Multi-line TOTAL \\n 514.50 should extract 514.5 (got ${r5.amount})`);

// -----------------------------------------------------------------------------
// Test 6: Different Total Receipt 1: Grocery Supermarket ₹1,250.00 (NOT 514.50!)
// -----------------------------------------------------------------------------
const test6Receipt = `
SUPERMARKET MART
Bill No: 8841
Date: 15/05/2024
ITEMS QTY AMOUNT
Rice 5kg 1 350.00
Cooking Oil 1L 2 300.00
Wheat Flour 5kg 1 250.00
Almonds 500g 1 350.00
SUBTOTAL 1250.00
TOTAL ₹ 1,250.00
`;
const r6 = parseReceiptOCR(test6Receipt);
assert(r6.amount === 1250, `Test 6: Different receipt total ₹1,250.00 should extract 1250 (got ${r6.amount})`);
assert(['Food', 'Shopping'].includes(r6.category), `Test 6: Category should be Food or Shopping (got ${r6.category})`);

// -----------------------------------------------------------------------------
// Test 7: Different Total Receipt 2: Fuel/Petrol with misread ₹ as '3' (₹420 read as 3420)
// -----------------------------------------------------------------------------
const test7Receipt = `
INDIAN OIL PETROL PUMP
Date: 10/06/2024
Fuel: Petrol
Rate: 105.00
Quantity: 4.00 L
TOTAL 3420.00
`;
const r7 = parseReceiptOCR(test7Receipt);
assert(r7.amount === 420, `Test 7: Misread ₹ on petrol bill (TOTAL 3420.00) should extract 420 (got ${r7.amount})`);
assert(r7.category === 'Travel', `Test 7: Category should be Travel (got ${r7.category})`);

// -----------------------------------------------------------------------------
// Test 8: Different Total Receipt 3: Electronics Store with GRAND TOTAL ₹890.50
// -----------------------------------------------------------------------------
const test8Receipt = `
GADGET WORLD
Order Ref: 772
Date: 01/07/2024
USB-C Cable 1 290.50
Phone Case 1 600.00
GRAND TOTAL
₹ 890.50
`;
const r8 = parseReceiptOCR(test8Receipt);
assert(r8.amount === 890.5, `Test 8: Multi-line GRAND TOTAL ₹890.50 should extract 890.5 (got ${r8.amount})`);
assert(r8.category === 'Shopping', `Test 8: Category should be Shopping (got ${r8.category})`);

// -----------------------------------------------------------------------------
// Test 9: Missing / Unreadable Total: Marks amountUnclear = true for user confirmation
// -----------------------------------------------------------------------------
const test9Receipt = `
COFFEE SHOP
Date: 12/08/2024
Cappuccino 1
Croissant 1
(Receipt torn, total missing)
`;
const r9 = parseReceiptOCR(test9Receipt);
assert(r9.amountUnclear === true, `Test 9: Missing total must set amountUnclear = true (got ${r9.amountUnclear})`);

// -----------------------------------------------------------------------------
// Test 10: Hotel Prachi and Catering Service (Handwritten Bill with misread ₹ as 3)
// -----------------------------------------------------------------------------
const test10Receipt = `
HOTEL PRACHI AND CATERING SERVICE
Sr No. 007
Date 8/01/25
Item Qty Rate Amount
Mutton Meal 8 600 4800
TOTAL 3
4800.00
Rupees Four Thousand Eight Hundred Only
`;
const r10 = parseReceiptOCR(test10Receipt);
assert(r10.amount === 4800, `Test 10: Hotel Prachi amount should be 4800 (got ${r10.amount})`);
assert(r10.amount !== 3, `Test 10: Amount must NEVER be 3`);
assert(r10.amount !== 8, `Test 10: Amount must NEVER be quantity 8`);
assert(r10.amount !== 600, `Test 10: Amount must NEVER be rate 600`);
assert(r10.amount !== 7, `Test 10: Amount must NEVER be serial number 007`);
assert(r10.title === 'Mutton Meal - Hotel Prachi', `Test 10: Title should be "Mutton Meal - Hotel Prachi" (got "${r10.title}")`);
assert(r10.category === 'Food', `Test 10: Category should be Food (got ${r10.category})`);
assert(r10.date === '2025-01-08', `Test 10: Date should be 2025-01-08 (got ${r10.date})`);
assert(r10.dateUnclear === true, `Test 10: Handwritten date 8/01/25 should trigger verification warning (got ${r10.dateUnclear})`);
assert(r10.invoiceNumber === '007', `Test 10: Serial number should be 007 (got ${r10.invoiceNumber})`);

// -----------------------------------------------------------------------------
// Test 11: Hotel Prachi variation: TOTAL line has solitary 3, but words & item arithmetic confirm 4800
// -----------------------------------------------------------------------------
const test11Receipt = `
HOTEL PRACHI
Sr No 007
Date: 8/01/25
Mutton Meal 8 600
TOTAL 3
Four Thousand Eight Hundred Only
`;
const r11 = parseReceiptOCR(test11Receipt);
assert(r11.amount === 4800, `Test 11: Should reconcile amount in words & item arithmetic to 4800 (got ${r11.amount})`);
assert(r11.amount !== 3, `Test 11: Solitary 3 on TOTAL line must be rejected`);
assert(r11.title === 'Mutton Meal - Hotel Prachi', `Test 11: Title should be "Mutton Meal - Hotel Prachi" (got "${r11.title}")`);
assert(r11.category === 'Food', `Test 11: Category should be Food (got ${r11.category})`);

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------');
console.log(`Results: ${passedCount} / ${totalCount} tests passed.`);
console.log('----------------------------------------------------');

if (passedCount !== totalCount) {
  process.exit(1);
} else {
  console.log('All regression tests passed successfully!');
}
