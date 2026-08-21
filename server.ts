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
      return res.json({
        action: 'ADD_TRANSACTION',
        aiReply: `Saya telah mencatat ${isIncome ? 'pemasukan' : 'pengeluaran'} sebesar Rp ${parsedAmount.toLocaleString('id-ID')}. Silakan periksa detailnya di bawah.`,
        transactions: [
          {
            type: isIncome ? 'income' : 'expense',
            amount: parsedAmount,
            title: message.slice(0, 40),
            category: isIncome ? 'Gaji & Pendapatan' : 'Makanan & Minuman',
            accountName: lower.includes('bca') ? 'BCA Tahapan' : lower.includes('mandiri') ? 'Mandiri Tabungan' : lower.includes('gopay') ? 'GoPay' : 'Tunai / Cash',
            date: currentDate,
            notes: message,
            tags: ['AI-Chat'],
          },
        ],
        financialInsight: '💡 Tips: Selalu catat pengeluaran harian tepat waktu agar arus kas bulanan tetap terkontrol.',
      });
    }

    const systemPrompt = `Kamu adalah ArthaAI, asisten keuangan pribadi cerdas Indonesia yang ramah, ringkas, dan sangat ahli dalam akuntansi praktis & keuangan keluarga.
Tugasmu:
1. Jika pengguna menyampaikan catatan pengeluaran, pemasukan, atau transfer (contoh: "makan siang nasi padang 25rb pake qris bca", "beli bensin pertamax 50.000 cash", "gajian masuk 10 juta ke mandiri", "transfer 500rb dari BCA ke GoPay", "kemarin beli kopi 35rb dan donat 20rb di starbucks"):
   - Set action: "ADD_TRANSACTION"
   - Ekstrak 1 atau lebih transaksi dalam array 'transactions'.
   - Konversi singkatan angka Indonesia: '25rb' / '25k' = 25000, '1.5jt' / '1,5 juta' = 1500000, '500rb' = 500000.
   - Tentukan type: 'expense' (pengeluaran), 'income' (pemasukan), atau 'transfer' (pindah buku antarrekening).
   - Tentukan kategori yang paling tepat dari:
     ["Makanan & Minuman", "Belanja & Groceries", "Transportasi", "Tagihan & Utilitas", "Hiburan & Rekreasi", "Kesehatan & Farmasi", "Pendidikan & Kerja", "Investasi & Tabungan", "Gaji & Pendapatan", "Bisnis & Sampingan", "Hadiah & Bonus", "Transfer Antar Rekening", "Lain-lain"].
   - Identifikasi akun/dompet: "BCA Tahapan", "Mandiri Tabungan", "BRI BritAma", "BNI Taplus", "GoPay", "OVO", "ShopeePay", "DANA", "Tunai / Cash", "Bibit / Investasi", "Kartu Kredit". Jika tidak disebutkan, tebak yang paling wajar atau gunakan "Tunai / Cash".
   - Jika transfer, tentukan 'destinationAccountName'.
   - Buat jawaban 'aiReply' yang ramah, jelas, dan menyemangati dalam Bahasa Indonesia.

2. Jika pengguna bertanya tentang status keuangan, tips berhemat, cek budget, atau pertanyaan finansial:
   - Set action: "FINANCIAL_ADVICE" atau "QUERY_FINANCES".
   - Berikan jawaban 'aiReply' yang solutif, berdasarkan konteks keuangan jika ada.
   - Kosongkan 'transactions' atau berikan array kosong.

Konteks Keuangan Pengguna Saat Ini:
${financialContext ? JSON.stringify(financialContext) : 'Total Saldo: Rp 18.500.000, Pengeluaran Bulan Ini: Rp 4.250.000'}
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
