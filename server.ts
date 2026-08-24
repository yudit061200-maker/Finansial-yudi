import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini AI client (server-side only)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment variables.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. API: Parse receipt image using Gemini 3.7 Flash
app.post('/api/ai/parse-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback mock parser if API key is not configured
      return res.json({
        merchant: 'Indomaret Point',
        date: new Date().toISOString().split('T')[0],
        time: '14:30',
        receiptNumber: 'IND-' + Math.floor(100000 + Math.random() * 900000),
        items: [
          { name: 'Susu UHT Full Cream 1L', quantity: 2, price: 21500, total: 43000, category: 'Makanan & Minuman' },
          { name: 'Roti Gandum Toast', quantity: 1, price: 18000, total: 18000, category: 'Makanan & Minuman' },
          { name: 'Deterjen Cair 800ml', quantity: 1, price: 24500, total: 24500, category: 'Kebutuhan Rumah' }
        ],
        subtotal: 85500,
        tax: 0,
        serviceCharge: 0,
        discount: 0,
        total: 85500,
        paymentMethod: 'QRIS BCA',
        suggestedCategory: 'Belanja & Groceries',
        confidence: 0.95,
        notes: 'Hasil ekstraksi struk belanja'
      });
    }

    // Clean base64 string if it contains prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Kamu adalah asisten OCR & Analisis Struk Keuangan Indonesia yang sangat teliti.
Analisis gambar struk/nota/bukti pembayaran/faktur ini dan ekstrak data selengkap dan seakurat mungkin dalam format JSON terstruktur.

Kategori yang disarankan dapat berupa salah satu dari:
- "Makanan & Minuman"
- "Belanja & Groceries"
- "Transportasi"
- "Tagihan & Utilitas"
- "Kesehatan & Farmasi"
- "Hiburan & Rekreasi"
- "Kebutuhan Rumah"
- "Pendidikan & Kerja"
- "Lainnya"

Jika ada item/barang belanjaan tertera, ekstrak setiap baris nama barang, kuantitas (quantity), harga satuan (price dalam Rupiah integer), total per item, dan perkiraan kategori item tersebut.
Jika harga tidak ada desimal, gunakan integer.
Jika tanggal struk tidak tertera jelas, gunakan tanggal hari ini (${new Date().toISOString().split('T')[0]}).`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING, description: 'Nama toko/merchant/kasir/restoran' },
            date: { type: Type.STRING, description: 'Tanggal transaksi format YYYY-MM-DD' },
            time: { type: Type.STRING, description: 'Waktu transaksi format HH:mm' },
            receiptNumber: { type: Type.STRING, description: 'Nomor nota/struk/referensi jika ada' },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Nama produk/item' },
                  quantity: { type: Type.NUMBER, description: 'Jumlah kuantitas' },
                  price: { type: Type.NUMBER, description: 'Harga satuan dalam Rupiah' },
                  total: { type: Type.NUMBER, description: 'Total harga item dalam Rupiah' },
                  category: { type: Type.STRING, description: 'Kategori item' },
                },
                required: ['name', 'quantity', 'price', 'total'],
              },
            },
            subtotal: { type: Type.NUMBER, description: 'Subtotal sebelum diskon dan pajak' },
            tax: { type: Type.NUMBER, description: 'PPN / Pajak (0 jika tidak ada)' },
            serviceCharge: { type: Type.NUMBER, description: 'Biaya layanan / Service charge (0 jika tidak ada)' },
            discount: { type: Type.NUMBER, description: 'Potongan harga / diskon (0 jika tidak ada)' },
            total: { type: Type.NUMBER, description: 'Total akhir yang dibayarkan dalam Rupiah' },
            paymentMethod: { type: Type.STRING, description: 'Metode pembayaran (misal: Tunai, QRIS, BCA Debit, Mandiri, ShopeePay)' },
            suggestedCategory: { type: Type.STRING, description: 'Kategori utama pengeluaran' },
            confidence: { type: Type.NUMBER, description: 'Tingkat keyakinan ekstraksi antara 0 dan 1' },
            notes: { type: Type.STRING, description: 'Catatan ringkas ekstraksi struk' },
          },
          required: ['merchant', 'date', 'items', 'total', 'suggestedCategory'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/parse-receipt:', error);
    return res.status(500).json({
      error: 'Gagal memproses struk dengan AI.',
      details: error.message,
    });
  }
});

// 2. API: Parse natural language chat into financial transactions or insights
app.post('/api/ai/parse-chat', async (req, res) => {
  try {
    const { message, financialContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getGeminiClient();
    const currentDate = new Date().toISOString().split('T')[0];
    const userAccounts: Array<{ id: string; name: string; type: string; provider: string; balance?: number }> =
      financialContext?.availableAccounts || [];

    // Helper to resolve account from available accounts list based on text
    const findAccountFromText = (text: string, defaultType: 'expense' | 'income' | 'transfer' = 'expense') => {
      const lower = text.toLowerCase();
      if (userAccounts.length === 0) {
        if (lower.includes('bca')) return 'BCA Tahapan';
        if (lower.includes('mandiri')) return 'Mandiri Tabungan';
        if (lower.includes('bri')) return 'BRI BritAma';
        if (lower.includes('bni')) return 'BNI Taplus';
        if (lower.includes('gopay')) return 'GoPay Saldo Utama';
        if (lower.includes('ovo')) return 'OVO Premier';
        if (lower.includes('dana')) return 'DANA Saldo';
        if (lower.includes('shopee') || lower.includes('spay')) return 'ShopeePay';
        if (lower.includes('cash') || lower.includes('tunai')) return 'Dompet Tunai (Cash)';
        return defaultType === 'income' ? 'BCA Tahapan' : 'Dompet Tunai (Cash)';
      }

      // Check specific bank/wallet keywords in user text
      const matched = userAccounts.find((a) => {
        const aName = a.name.toLowerCase();
        const aProv = (a.provider || '').toLowerCase();
        if (lower.includes('bca') && (aProv.includes('bca') || aName.includes('bca'))) return true;
        if (lower.includes('mandiri') && (aProv.includes('mandiri') || aName.includes('mandiri'))) return true;
        if (lower.includes('bri') && (aProv.includes('bri') || aName.includes('bri'))) return true;
        if (lower.includes('bni') && (aProv.includes('bni') || aName.includes('bni'))) return true;
        if (lower.includes('cimb') && (aProv.includes('cimb') || aName.includes('cimb'))) return true;
        if (lower.includes('jago') && (aProv.includes('jago') || aName.includes('jago'))) return true;
        if (lower.includes('seabank') && (aProv.includes('seabank') || aName.includes('seabank'))) return true;
        if (lower.includes('gopay') && (aProv.includes('gopay') || aName.includes('gopay'))) return true;
        if (lower.includes('ovo') && (aProv.includes('ovo') || aName.includes('ovo'))) return true;
        if (lower.includes('dana') && (aProv.includes('dana') || aName.includes('dana'))) return true;
        if ((lower.includes('shopee') || lower.includes('spay')) && (aProv.includes('shopee') || aName.includes('shopee'))) return true;
        if ((lower.includes('tunai') || lower.includes('cash') || lower.includes('dompet')) && (a.type === 'cash' || aProv.includes('cash') || aName.includes('tunai') || aName.includes('cash'))) return true;
        return aName.includes(lower) || lower.includes(aName);
      });

      if (matched) return matched.name;

      // If no explicit bank/wallet in text:
      if (defaultType === 'income') {
        const bankAcc = userAccounts.find((a) => a.type === 'bank');
        return bankAcc ? bankAcc.name : userAccounts[0]?.name || 'Rekening Bank Utama';
      }
      const cashAcc = userAccounts.find((a) => a.type === 'cash' || (a.provider || '').toLowerCase().includes('cash'));
      return cashAcc ? cashAcc.name : userAccounts[0]?.name || 'Dompet Tunai (Cash)';
    };

    if (!ai) {
      // Fallback parser if Gemini key is not present
      const lower = message.toLowerCase();
      const amountMatch = message.match(/(?:rp\.?\s*|)(\d+(?:[\.,]\d+)?)\s*(?:rb|ribu|k|jt|juta|)/i);
      let parsedAmount = 50000;
      if (amountMatch) {
        let val = parseFloat(amountMatch[1].replace(',', '.'));
        if (/jt|juta/i.test(message)) val *= 1000000;
        else if (/rb|ribu|k/i.test(message)) val *= 1000;
        parsedAmount = val;
      }

      const isIncome = /gaji|masuk|terima|pendapatan|transferan dari/i.test(lower);
      const isTransfer = /transfer|pindah|topup|top up|isi saldo/i.test(lower) && !isIncome;
      const txType = isIncome ? 'income' : isTransfer ? 'transfer' : 'expense';
      const resolvedAccount = findAccountFromText(message, txType);

      let destAccountName: string | undefined = undefined;
      if (isTransfer) {
        // Guess destination
        const destMatch = userAccounts.find((a) => a.name !== resolvedAccount);
        destAccountName = destMatch ? destMatch.name : 'GoPay Saldo Utama';
      }

      return res.json({
        action: isTransfer ? 'TRANSFER' : 'ADD_TRANSACTION',
        aiReply: `Saya telah mencatat ${isIncome ? 'pemasukan' : isTransfer ? 'transfer dana' : 'pengeluaran'} sebesar Rp ${parsedAmount.toLocaleString('id-ID')} pada akun ${resolvedAccount}.`,
        transactions: [
          {
            type: txType,
            amount: parsedAmount,
            title: message.slice(0, 40),
            category: isIncome ? 'Gaji & Pendapatan' : isTransfer ? 'Transfer Antar Rekening' : 'Makanan & Minuman',
            accountName: resolvedAccount,
            destinationAccountName: destAccountName,
            date: currentDate,
            notes: message,
            tags: ['AI-Chat'],
          },
        ],
        financialInsight: '💡 Tips: Catatan transaksi otomatis disinkronkan ke saldo akun Anda di Firebase.',
      });
    }

    const accountsContextStr = userAccounts.length > 0
      ? userAccounts.map((a) => `- ID: ${a.id} | Nama: "${a.name}" | Tipe: ${a.type} | Provider: ${a.provider} | Saldo: Rp ${a.balance || 0}`).join('\n')
      : '- (Belum ada akun kustom, gunakan akun standar seperti BCA, Mandiri, GoPay, DANA, OVO, Cash)';

    const systemPrompt = `Kamu adalah ArthaAI, asisten keuangan pribadi cerdas Indonesia yang ramah, ringkas, dan sangat ahli dalam akuntansi praktis & keuangan keluarga.

DAFTAR REKENING & DOMPET PENGGUNA YANG TERDAFTAR DI APLIKASI:
${accountsContextStr}

ATURAN WAJIB PEMILIHAN AKUN ('accountName' & 'destinationAccountName'):
1. Kamu HARUS mencocokkan akun pembayaran PERSIS dengan apa yang diketik pengguna dalam chat:
   - Jika pengguna menyebut "bca" / "qris bca" / "debit bca" -> pilih nama akun BCA pengguna dari daftar di atas.
   - Jika pengguna menyebut "mandiri" / "livin" -> pilih nama akun Mandiri pengguna dari daftar di atas.
   - Jika pengguna menyebut "bri" / "brimo" -> pilih nama akun BRI pengguna dari daftar di atas.
   - Jika pengguna menyebut "bni" / "wondr" -> pilih nama akun BNI pengguna dari daftar di atas.
   - Jika pengguna menyebut "cimb" / "octo" -> pilih nama akun CIMB pengguna dari daftar di atas.
   - Jika pengguna menyebut "jago" -> pilih nama akun Bank Jago pengguna dari daftar di atas.
   - Jika pengguna menyebut "seabank" -> pilih nama akun SeaBank pengguna dari daftar di atas.
   - Jika pengguna menyebut "gopay" / "gojek" -> pilih nama akun GoPay pengguna dari daftar di atas.
   - Jika pengguna menyebut "ovo" -> pilih nama akun OVO pengguna dari daftar di atas.
   - Jika pengguna menyebut "dana" -> pilih nama akun DANA pengguna dari daftar di atas.
   - Jika pengguna menyebut "shopee" / "spay" / "shopeepay" -> pilih nama akun ShopeePay pengguna dari daftar di atas.
   - Jika pengguna menyebut "cash" / "tunai" / "dompet" / "uang fisik" -> pilih nama akun tipe 'cash' (Dompet Tunai) dari daftar di atas.
   - Jika pengguna TIDAK menyebutkan nama bank/dompet sama sekali dalam pesannya:
     * Pengeluaran kecil harian (makan, jajan, parkir, bensin, warung): gunakan akun tipe 'cash' (Dompet Tunai) jika tersedia.
     * Pemasukan / Gaji: gunakan akun rekening bank utama.
2. Jika transaksi TRANSFER / PINDAH DANA (contoh: "transfer 500rb dari BCA ke GoPay" atau "topup dana 100rb pake mandiri"):
   - 'accountName' adalah akun ASAL / Pengirim dana (misal: BCA atau Mandiri).
   - 'destinationAccountName' adalah akun TUJUAN / Penerima dana (misal: GoPay atau DANA).
3. Pastikan format 'accountName' dan 'destinationAccountName' menggunakan NAMA AKUN PERSIS seperti yang tercantum di daftar akun pengguna di atas agar pemotongan dan penambahan saldo tepat sasaran!

Tugas Lainnya:
- Konversi nominal: '25rb' / '25k' = 25000, '1.5jt' = 1500000, '500rb' = 500000.
- Tentukan type: 'expense', 'income', atau 'transfer'.
- Tentukan kategori: ["Makanan & Minuman", "Belanja & Groceries", "Transportasi", "Tagihan & Utilitas", "Hiburan & Rekreasi", "Kesehatan & Farmasi", "Pendidikan & Kerja", "Investasi & Tabungan", "Gaji & Pendapatan", "Bisnis & Sampingan", "Hadiah & Bonus", "Transfer Antar Rekening", "Lain-lain"].
- Sertakan dalam 'aiReply' penjelasan ramah yang menyebutkan akun mana yang terpotong/bertambah (contoh: "Sudah saya catat! Pengeluaran Rp 25.000 untuk Makan Siang dipotong dari saldo GoPay Anda.").

Tanggal Hari Ini: ${currentDate}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: 'ADD_TRANSACTION, FINANCIAL_ADVICE, QUERY_FINANCES, atau TRANSFER',
            },
            aiReply: {
              type: Type.STRING,
              description: 'Respon percakapan yang ramah dan informatif dalam Bahasa Indonesia',
            },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: 'expense, income, atau transfer' },
                  amount: { type: Type.NUMBER, description: 'Jumlah nominal dalam Rupiah (integer)' },
                  title: { type: Type.STRING, description: 'Judul / keterangan transaksi' },
                  category: { type: Type.STRING, description: 'Kategori transaksi' },
                  accountName: { type: Type.STRING, description: 'Nama akun asal / dompet' },
                  destinationAccountName: { type: Type.STRING, description: 'Nama akun tujuan (khusus transfer)' },
                  date: { type: Type.STRING, description: 'Format YYYY-MM-DD' },
                  notes: { type: Type.STRING, description: 'Catatan tambahan' },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['type', 'amount', 'title', 'category', 'accountName', 'date'],
              },
            },
            financialInsight: {
              type: Type.STRING,
              description: 'Insight atau tips finansial singkat yang relevan',
            },
          },
          required: ['action', 'aiReply', 'transactions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/parse-chat:', error);
    return res.status(500).json({
      error: 'Gagal memproses pesan AI chat.',
      details: error.message,
    });
  }
});

// 3. API: Generate smart financial insights & anomaly detection
app.post('/api/ai/insights', async (req, res) => {
  try {
    const { summaryData } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        healthScore: 84,
        status: 'Sangat Sehat',
        summary: 'Pola pengeluaran Anda bulan ini stabil. Rasio tabungan berada di angka 28%, jauh di atas standar aman 20%.',
        topSpendingCategory: 'Makanan & Minuman',
        potentialSavings: 'Anda bisa menghemat hingga Rp 350.000 dengan mengurangi pesan antar online.',
        actionableTips: [
          'Pertahankan alokasi dana darurat hingga mencapai minimal 6 kali pengeluaran bulanan.',
          'Kategori Belanja & Groceries mendekati 85% dari batas budget bulanan.',
          'Sinkronisasi mutasi rekening BCA & GoPay secara rutin setiap akhir pekan.'
        ]
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `Analisis data ringkasan keuangan berikut dan berikan penilaian kesehatan finansial (0-100), diagnosis, kategori pengeluaran tertinggi, estimasi potensi penghematan, serta 3 rekomendasi taktis dalam Bahasa Indonesia.
Data: ${JSON.stringify(summaryData)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER, description: 'Skor kesehatan finansial 0-100' },
            status: { type: Type.STRING, description: 'Misal: Perlu Perhatian, Sehat, Sangat Sehat, Prima' },
            summary: { type: Type.STRING, description: 'Ringkasan analisis komprehensif' },
            topSpendingCategory: { type: Type.STRING, description: 'Kategori pengeluaran terbesar' },
            potentialSavings: { type: Type.STRING, description: 'Estimasi nominal/area yang bisa dihemat' },
            actionableTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 tips aksi nyata untuk meningkatkan tabungan'
            }
          },
          required: ['healthScore', 'status', 'summary', 'actionableTips']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/insights:', error);
    return res.status(500).json({ error: 'Gagal membuat analisis finansial AI' });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server if executed directly as main script (e.g. node server.ts / tsx server.ts)
const PORT = process.env.PORT || 3000;
const isDirectExecution = process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')) && !process.argv.some(arg => arg.includes('vite'));

if (isDirectExecution) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
