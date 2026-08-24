import React, { useState } from 'react';
import { Account, ParsedReceiptData, Transaction, ReceiptItem } from '../types/finance';
import { SAMPLE_RECEIPTS } from '../data/initialData';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { aiService } from '../services/aiService';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  Receipt,
  FileImage,
  RefreshCw,
  Plus,
  Trash2,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Store,
  CreditCard,
} from 'lucide-react';

interface ReceiptScannerProps {
  accounts: Account[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddMultipleTransactions?: (transactions: Array<Omit<Transaction, 'id'>>) => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  accounts,
  onAddTransaction,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handle file drop / upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      runOcrAnalysis(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Run OCR with Gemini 3.7 Flash
  const runOcrAnalysis = async (base64Image: string, mimeType: string = 'image/jpeg') => {
    setIsScanning(true);
    setParsedData(null);
    setSaveSuccess(false);

    try {
      setScanStep('1. Membaca gambar struk & teks...');
      await new Promise((r) => setTimeout(r, 400));
      setScanStep('2. Mengekstrak nama merchant & daftar item...');

      const result = await aiService.parseReceipt(base64Image, mimeType);
      result.rawImage = base64Image;

      setScanStep('3. Mengelompokkan kategori pengeluaran...');
      await new Promise((r) => setTimeout(r, 300));

      setParsedData(result);
    } catch (err: any) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // Load a pre-configured sample receipt for instant testing
  const handleSelectSample = (sample: typeof SAMPLE_RECEIPTS[0]) => {
    // Generate high quality SVG receipt representation as image
    const svgReceipt = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="%23FFFFFF">
      <rect width="400" height="600" fill="%23F8FAFC"/>
      <rect x="20" y="20" width="360" height="560" rx="8" fill="%23FFFFFF" stroke="%23E2E8F0" stroke-width="2"/>
      <text x="200" y="60" font-family="monospace" font-size="16" font-weight="bold" text-anchor="middle" fill="%230F172A">${sample.merchant}</text>
      <text x="200" y="85" font-family="monospace" font-size="12" text-anchor="middle" fill="%2364748B">${sample.date} - NOTA #${sample.id.toUpperCase()}</text>
      <line x1="40" y1="105" x2="360" y2="105" stroke="%23CBD5E1" stroke-dasharray="4 4"/>
      ${sample.items
        .map(
          (item, i) => `
        <text x="40" y="${135 + i * 35}" font-family="monospace" font-size="12" fill="%23334155">${item.name}</text>
        <text x="40" y="${150 + i * 35}" font-family="monospace" font-size="10" fill="%2394A3B8">${item.quantity} x Rp ${item.price.toLocaleString('id-ID')}</text>
        <text x="360" y="${145 + i * 35}" font-family="monospace" font-size="12" font-weight="bold" text-anchor="end" fill="%230F172A">Rp ${item.total.toLocaleString('id-ID')}</text>
      `
        )
        .join('')}
      <line x1="40" y1="460" x2="360" y2="460" stroke="%23CBD5E1" stroke-dasharray="4 4"/>
      <text x="40" y="490" font-family="monospace" font-size="14" font-weight="bold" fill="%230F172A">TOTAL PEMBAYARAN</text>
      <text x="360" y="490" font-family="monospace" font-size="16" font-weight="bold" text-anchor="end" fill="%230F172A">Rp ${sample.total.toLocaleString('id-ID')}</text>
      <text x="200" y="540" font-family="monospace" font-size="11" text-anchor="middle" fill="%2310B981">LUNAS - TERIMA KASIH</text>
    </svg>`;

    setSelectedImage(svgReceipt);

    // Set parsed data directly with realistic accuracy
    setParsedData({
      merchant: sample.merchant,
      date: sample.date,
      time: '13:45',
      receiptNumber: `REC-${sample.id.slice(-4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      items: sample.items,
      subtotal: sample.total,
      tax: 0,
      discount: 0,
      total: sample.total,
      paymentMethod: 'QRIS / Debit',
      suggestedCategory: sample.category,
      confidence: 0.98,
      notes: `Struk pembelian di ${sample.merchant}`,
      rawImage: svgReceipt,
    });
  };

  // Save parsed receipt into user transactions
  const handleSaveTransaction = () => {
    if (!parsedData) return;

    const matchedAcc = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

    const receiptItemsFormatted: ReceiptItem[] = parsedData.items.map((item, idx) => ({
      id: `ri-${Date.now()}-${idx}`,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
      category: item.category || parsedData.suggestedCategory,
    }));

    onAddTransaction({
      date: parsedData.date || new Date().toISOString().split('T')[0],
      title: `${parsedData.merchant}`,
      amount: parsedData.total,
      type: 'expense',
      category: parsedData.suggestedCategory || 'Belanja & Groceries',
      accountId: matchedAcc.id,
      paymentMethod: parsedData.paymentMethod || `Debit (${matchedAcc.name})`,
      source: 'receipt_scan',
      notes: `${parsedData.items.length} item belanjaan terlampir dari ${parsedData.merchant}`,
      tags: ['Struk-Scan', 'OCR', parsedData.merchant.split(' ')[0]],
      receiptImage: parsedData.rawImage,
      receiptItems: receiptItemsFormatted,
      isVerified: true,
    });

    setSaveSuccess(true);
  };

  // Update line item in editor
  const handleUpdateItem = (index: number, field: string, value: any) => {
    if (!parsedData) return;
    const updatedItems = [...parsedData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate total
    if (field === 'price' || field === 'quantity') {
      updatedItems[index].total = updatedItems[index].price * updatedItems[index].quantity;
    }

    const newTotal = updatedItems.reduce((sum, it) => sum + it.total, 0);

    setParsedData({
      ...parsedData,
      items: updatedItems,
      total: newTotal,
      subtotal: newTotal,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!parsedData) return;
    const updatedItems = parsedData.items.filter((_, i) => i !== index);
    const newTotal = updatedItems.reduce((sum, it) => sum + it.total, 0);

    setParsedData({
      ...parsedData,
      items: updatedItems,
      total: newTotal,
      subtotal: newTotal,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Scan Struk & Nota Belanja</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                <Sparkles className="w-3.5 h-3.5" />
                Multimodal AI OCR
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Unggah foto struk belanjaan (Indomaret, Superindo, Cafe, PLN, SPBU). AI akan mengekstrak setiap item secara otomatis.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Upload & Sample Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Dropzone & Sample Receipts (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dropzone Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Unggah Foto Struk</h2>

            <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group block">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Klik untuk ambil foto / upload struk</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Mendukung JPG, PNG, WEBP, atau screenshot</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Receipt Preview if loaded */}
            {selectedImage && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <FileImage className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Foto Struk Terpilih
                  </span>
                  {isScanning && (
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-[11px] font-bold">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Scanning...
                    </span>
                  )}
                </div>
                <div className="h-44 w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 p-2">
                  <img
                    src={selectedImage}
                    alt="Receipt preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick Preset Samples for Testing */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                🧪 Contoh Struk Instan:
              </h3>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">Test 1-Klik</span>
            </div>

            <div className="space-y-2">
              {SAMPLE_RECEIPTS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50/50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-2xl transition-colors flex items-center justify-between text-left group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 shadow-xs">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{sample.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{sample.items.length} items • {sample.category}</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                    {formatRupiah(sample.total)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Extraction & Itemized Review (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Hasil Ekstraksi & Rincian Belanja</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verifikasi item dan simpan ke pencatatan keuangan</p>
              </div>
              {parsedData?.confidence && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
                  Akurasi: {Math.round(parsedData.confidence * 100)}%
                </span>
              )}
            </div>

            {isScanning ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <div className="text-sm font-bold text-slate-900 dark:text-white">Gemini 3.7 Flash Memproses Struk</div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{scanStep}</div>
              </div>
            ) : !parsedData ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 space-y-2">
                <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum ada struk yang dipindai.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Unggah gambar atau pilih salah satu contoh struk di sebelah kiri.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Meta Header Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 rounded-2xl text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold flex items-center gap-1">
                      <Store className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      Merchant / Toko
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">{parsedData.merchant}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      Tanggal & Waktu
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatDateIndo(parsedData.date)} {parsedData.time ? `• ${parsedData.time}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      Metode Pembayaran
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {parsedData.paymentMethod || 'QRIS / Debit'}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Daftar Item ({parsedData.items.length})
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Dapat diedit sebelum disimpan</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    {parsedData.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            className="w-full bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none border-b border-transparent focus:border-indigo-500 text-xs"
                          />
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>Qty: </span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)
                              }
                              className="w-10 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 text-center text-slate-900 dark:text-white font-bold"
                            />
                            <span>x {formatRupiah(item.price)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(item.total)}</span>
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                            title="Hapus baris item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotal, Tax & Total Calculation */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(parsedData.subtotal || parsedData.total)}</span>
                  </div>
                  {parsedData.tax > 0 && (
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
                      <span>PPN / Pajak:</span>
                      <span>{formatRupiah(parsedData.tax)}</span>
                    </div>
                  )}
                  {parsedData.discount && parsedData.discount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Diskon / Potongan:</span>
                      <span>-{formatRupiah(parsedData.discount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>Total Pembayaran:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 text-base font-black">{formatRupiah(parsedData.total)}</span>
                  </div>
                </div>

                {/* Account / Wallet Destination Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Potong dari Rekening / Dompet:
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {formatRupiah(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Save Confirmation Button */}
                {saveSuccess ? (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Struk berhasil disimpan ke daftar transaksi!</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveTransaction}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan {formatRupiah(parsedData.total)} ke Catatan Pengeluaran</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
