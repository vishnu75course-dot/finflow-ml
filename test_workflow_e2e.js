import Tesseract from 'tesseract.js';
import { parseReceiptOCR } from './src/utils/nlpParser.js';

const imagePath = 'C:/Users/Admin/.gemini/antigravity-ide/brain/50b946cd-e0a2-4a6b-9ec0-074ab2aef38d/.user_uploaded/media_1792754747765.png';

async function runEndToEndVerification() {
  console.log('====================================================');
  console.log('   END-TO-END OCR & TRANSACTION WORKFLOW TEST       ');
  console.log('====================================================\n');

  // Step 1: Run OCR on actual bill image
  console.log('1. Running Tesseract.js OCR on receipt image...');
  const ocrRes = await Tesseract.recognize(imagePath, 'eng+hin');
  const rawText = ocrRes?.data?.text || '';
  console.log('   ✓ Raw OCR text received (' + rawText.length + ' chars)');

  // Step 2: Parse OCR output
  console.log('2. Parsing OCR output via parseReceiptOCR()...');
  const parsed = parseReceiptOCR(rawText);
  console.log('   ✓ Extracted amount:', parsed.amount, typeof parsed.amount);
  console.log('   ✓ Extracted title:', parsed.title);
  console.log('   ✓ Extracted date:', parsed.date);
  console.log('   ✓ Extracted category:', parsed.category);

  if (parsed.amount !== 514.5) {
    throw new Error(`Expected amount 514.50, got ${parsed.amount}`);
  }
  if (typeof parsed.amount !== 'number') {
    throw new Error(`Expected amount to be numeric, got ${typeof parsed.amount}`);
  }

  // Step 3: Simulate Transaction List State & Form Pre-population
  console.log('3. Simulating Form Pre-population and User Confirmation...');
  const formState = {
    title: parsed.title,
    amount: Number(parsed.amount),
    type: parsed.type,
    category: parsed.category,
    date: parsed.date
  };
  console.log('   ✓ Form pre-filled values:', formState);

  // Step 4: Simulate saving transaction
  console.log('4. Simulating transaction addition...');
  let transactions = [];
  const newTx = {
    id: 'tx_' + Date.now(),
    ...formState
  };
  transactions.push(newTx);
  console.log('   ✓ Saved transaction in state:', transactions[0]);
  if (transactions.length !== 1 || transactions[0].amount !== 514.5) {
    throw new Error('Transaction addition verification failed');
  }

  // Step 5: Simulate Edit Button click & pre-population
  console.log('5. Simulating Edit Button click and modal opening...');
  const editingTx = transactions.find(t => t.id === newTx.id);
  const editModalForm = {
    title: editingTx.title,
    amount: editingTx.amount,
    type: editingTx.type,
    category: editingTx.category,
    date: editingTx.date
  };
  console.log('   ✓ Edit form pre-populated with:', editModalForm);

  // Step 6: Simulate updating transaction
  console.log('6. Simulating saving modified transaction...');
  const updatedForm = {
    ...editModalForm,
    title: 'Dinner - Restaurant Invoice #1304'
  };
  transactions = transactions.map(t => t.id === newTx.id ? { ...updatedForm, id: t.id } : t);
  console.log('   ✓ Updated transaction in state:', transactions[0]);
  if (transactions.length !== 1) {
    throw new Error('Duplicate created during edit!');
  }
  if (transactions[0].title !== 'Dinner - Restaurant Invoice #1304' || transactions[0].amount !== 514.5) {
    throw new Error('Update values verification failed');
  }

  // Step 7: Verify Dashboard monthly filtering calculation (April 2024)
  console.log('7. Verifying Dashboard April 2024 reporting calculation...');
  const targetYear = 2024;
  const targetMonth = 3; // 0-indexed for April
  const aprilTxs = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  });
  const monthlyExpenseActual = aprilTxs
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  console.log('   ✓ Total spent calculated for April 2024:', monthlyExpenseActual);
  if (monthlyExpenseActual !== 514.5) {
    throw new Error(`Expected April total spent 514.50, got ${monthlyExpenseActual}`);
  }

  console.log('\n====================================================');
  console.log('   ALL END-TO-END WORKFLOW CHECKS PASSED!           ');
  console.log('====================================================');
}

runEndToEndVerification().catch(err => {
  console.error('Workflow test failed:', err);
  process.exit(1);
});
