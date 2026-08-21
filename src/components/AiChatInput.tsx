import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Transaction, Account } from '../types/finance';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { aiService } from '../services/aiService';
import {
  Send,
  Sparkles,
  BotMessageSquare,
  User,
  Check,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

interface AiChatInputProps {
  accounts: Account[];
  chatHistory: ChatMessage[];
  onSaveChatMessage: (msg: ChatMessage) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  financialContextSummary?: any;
}

export const AiChatInput: React.FC<AiChatInputProps> = ({
  accounts,
  chatHistory,
  onSaveChatMessage,
  onAddTransaction,
  financialContextSummary,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(chatHistory);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const quickPrompts = [
    'Makan siang Nasi Padang 28rb pake QRIS BCA',
    'Gajian masuk 18.500.000 ke Mandiri',
    'Beli bensin Pertamax 100rb di SPBU Shell pake Cash',
    'Transfer 250rb dari BCA ke GoPay buat jajan',
    'Berapa sisa budget makananku bulan ini?',
    'Kategori mana yang paling boros bulan ini?',
  ];

  const saveParsedTransactionDirectly = (
    txData: NonNullable<ChatMessage['parsedTransactions']>[number]
  ) => {
    // Find account by name, provider keyword, or fallback
    const targetName = (txData.accountName || '').toLowerCase();
    const matchedAccount =
      accounts.find((a) => {
        const aName = a.name.toLowerCase();
        const aProvider = (a.provider || '').toLowerCase();
        return (
          aName.includes(targetName) ||
          targetName.includes(aName) ||
          (targetName.includes('bca') && (aProvider === 'bca' || aName.includes('bca'))) ||
          (targetName.includes('mandiri') && (aProvider === 'mandiri' || aName.includes('mandiri'))) ||
          (targetName.includes('bri') && (aProvider === 'bri' || aName.includes('bri'))) ||
          (targetName.includes('bni') && (aProvider === 'bni' || aName.includes('bni'))) ||
          (targetName.includes('gopay') && (aProvider === 'gopay' || aName.includes('gopay'))) ||
          (targetName.includes('ovo') && (aProvider === 'ovo' || aName.includes('ovo'))) ||
          (targetName.includes('dana') && (aProvider === 'dana' || aName.includes('dana'))) ||
          (targetName.includes('shopee') && (aProvider === 'shopeepay' || aName.includes('shopee'))) ||
          ((targetName.includes('tunai') || targetName.includes('cash')) && (a.type === 'cash' || aProvider === 'cash'))
        );
      }) ||
      accounts[0] || {
        id: 'acc-cash',
        name: 'Dompet Tunai (Cash)',
        type: 'cash' as const,
        provider: 'cash' as const,
        accountNumberMasked: 'Tunai Fisik',
        balance: 0,
        currency: 'IDR',
        color: '#F59E0B',
        icon: 'Banknote',
      };

    const destName = (txData.destinationAccountName || '').toLowerCase();
    const destAccount = destName
      ? accounts.find((a) =>
          a.name.toLowerCase().includes(destName) ||
          destName.includes(a.name.toLowerCase()) ||
          (destName.includes('gopay') && a.provider === 'gopay') ||
          (destName.includes('ovo') && a.provider === 'ovo') ||
          (destName.includes('dana') && a.provider === 'dana')
        )
      : undefined;

    onAddTransaction({
      date: txData.date || new Date().toISOString().split('T')[0],
      title: txData.title,
      amount: txData.amount,
      type: txData.type,
      category: txData.category,
      accountId: matchedAccount.id,
      destinationAccountId: destAccount?.id,
      paymentMethod: `AI Chat (${matchedAccount.name})`,
      source: 'ai_chat',
      notes: txData.notes || `Dicatat via AI Chat: ${txData.title}`,
      tags: txData.tags && txData.tags.length > 0 ? txData.tags : ['AI-Chat'],
      isVerified: true,
    });
  };

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputMessage).trim();
    if (!text || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    onSaveChatMessage(userMsg);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const result = await aiService.parseChatMessage(text, financialContextSummary);

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: result.aiReply,
        timestamp: new Date().toISOString(),
        parsedTransactions: result.transactions,
        financialInsight: result.financialInsight,
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      onSaveChatMessage(aiMsg);

      // Automatically save parsed transactions directly to database without manual confirmation
      if (result.transactions && result.transactions.length > 0) {
        result.transactions.forEach((txData) => {
          saveParsedTransactionDirectly(txData);
        });
      }
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'ai',
        text: 'Maaf, terjadi gangguan saat memproses pesan. Namun Anda tetap dapat mencatat pengeluaran melalui tombol manual.',
        timestamp: new Date().toISOString(),
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <BotMessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">ArthaAI Financial Assistant</h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Gemini 3.7 Flash
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Ketik catatan pengeluaran, pemasukan, atau tanya kondisi keuangan. Data transaksi otomatis dicatat langsung!
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 overflow-y-auto space-y-4 shadow-sm">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                  isUser
                    ? 'bg-slate-800 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : 'AI'}
              </div>

              {/* Message Bubble & Content */}
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none font-medium'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Parsed Transaction Cards (Automatically Saved) */}
                {msg.parsedTransactions && msg.parsedTransactions.length > 0 && (
                  <div className="space-y-2.5 mt-2">
                    {msg.parsedTransactions.map((tx, idx) => {
                      const isExpense = tx.type === 'expense';
                      const isIncome = tx.type === 'income';

                      return (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Otomatis Tersimpan</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isExpense
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : isIncome
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}
                            >
                              {tx.type.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-900 text-xs truncate mr-2">
                              {tx.title}
                            </div>
                            <div
                              className={`font-black text-sm ${
                                isExpense
                                  ? 'text-rose-600'
                                  : isIncome
                                  ? 'text-emerald-600'
                                  : 'text-slate-900'
                              }`}
                            >
                              {formatRupiah(tx.amount)}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200 font-medium">
                            <div>
                              <span className="text-slate-400">Kategori: </span>
                              <span className="text-slate-800 font-semibold">{tx.category}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Akun: </span>
                              <span className="text-slate-800 font-semibold">{tx.accountName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Tanggal: </span>
                              <span className="text-slate-800 font-semibold">{formatDateIndo(tx.date)}</span>
                            </div>
                          </div>

                          <div className="pt-1">
                            <div className="w-full py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
                              <div className="flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Tersimpan di Saldo Akun & Catatan</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-medium">Auto-Sync</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Financial Insight Pill */}
                {msg.financialInsight && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-900 font-medium flex items-start gap-2.5 shadow-xs">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{msg.financialInsight}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold animate-pulse">
              AI
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-500 font-medium flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>ArthaAI sedang mencatat & menganalisis transaksi Anda...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Contoh:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            disabled={isProcessing}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="bg-white border border-slate-200 rounded-3xl p-2.5 shadow-sm shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ketik pengeluaran / pemasukan (contoh: Makan siang 35rb pake GoPay)..."
          disabled={isProcessing}
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-2xl border border-transparent focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isProcessing}
          className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </div>
    </div>
  );
};
