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

  const resolveAccountFromChat = (
    hintAccountName: string,
    userRawText: string,
    accountsList: Account[],
    txType: 'income' | 'expense' | 'transfer',
    isDestination: boolean = false
  ): Account => {
    if (accountsList.length === 0) {
      return {
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
    }

    const rawLower = userRawText.toLowerCase();
    const hintLower = (hintAccountName || '').toLowerCase().trim();

    // 1. Direct ID or exact name match from hint
    if (hintLower) {
      const exactIdMatch = accountsList.find((a) => a.id.toLowerCase() === hintLower);
      if (exactIdMatch) return exactIdMatch;

      const exactNameMatch = accountsList.find((a) => a.name.toLowerCase() === hintLower);
      if (exactNameMatch) return exactNameMatch;
    }

    // 2. For transfers, extract specific target substring
    let relevantText = rawLower;
    if (txType === 'transfer') {
      if (isDestination) {
        const destMatch = rawLower.match(/(?:ke|tujuan|menuju|top\s*up|isi\s+saldo|isi)\s+([a-z0-9\s]+)/i);
        if (destMatch) relevantText = destMatch[1];
      } else {
        const srcMatch = rawLower.match(/(?:dari|lewat|pake|pakai|via|debit|sumber)\s+([a-z0-9\s]+?)(?:\s+(?:ke|tujuan|buat|untuk)|$)/i);
        if (srcMatch) relevantText = srcMatch[1];
      }
    }

    // 3. Keyword dictionary for bank and e-wallet providers
    const bankKeywords: Record<string, string[]> = {
      bca: ['bca', 'flazz', 'blu', 'klikbca', 'mybca'],
      mandiri: ['mandiri', 'livin', 'e-money', 'emoney'],
      bri: ['bri', 'brimo', 'britama', 'simpedes', 'brizzi'],
      bni: ['bni', 'wondr', 'taplus', 'mobile banking bni'],
      cimb: ['cimb', 'octo', 'niaga'],
      jago: ['jago', 'bank jago', 'pocket jago'],
      jenius: ['jenius', 'btpn'],
      seabank: ['seabank', 'sea bank', 'sea'],
      bsi: ['bsi', 'syariah indonesia'],
      permata: ['permata', 'permatanet'],
      btn: ['btn'],
      panin: ['panin'],
      gopay: ['gopay', 'go-pay', 'gojek', 'tokopedia'],
      ovo: ['ovo', 'grab'],
      dana: ['dana'],
      shopeepay: ['shopee', 'spay', 'shopeepay', 'seabank'],
      linkaja: ['linkaja', 'tcash'],
      cash: ['cash', 'tunai', 'dompet', 'uang fisik', 'kantong', 'laci'],
      credit_card: ['cc', 'kartu kredit', 'credit card'],
    };

    // Calculate score for each user account
    const scoredAccounts = accountsList.map((acc) => {
      let score = 0;
      const accName = acc.name.toLowerCase();
      const accProv = (acc.provider || '').toLowerCase();
      const accType = acc.type;

      // Check hint text alignment
      if (hintLower) {
        if (accName === hintLower) score += 300;
        else if (accName.includes(hintLower) || hintLower.includes(accName)) score += 150;
        else if (accProv && (hintLower.includes(accProv) || accProv.includes(hintLower))) score += 120;
      }

      // Check keyword alignment in user message text
      for (const [providerKey, keywords] of Object.entries(bankKeywords)) {
        const textHasKeyword = keywords.some(
          (k) => relevantText.includes(k) || rawLower.includes(k)
        );

        if (textHasKeyword) {
          const accMatchesKeyword =
            accProv === providerKey ||
            keywords.some((k) => accName.includes(k) || accProv.includes(k)) ||
            (providerKey === 'cash' && (accType === 'cash' || accProv === 'cash')) ||
            (providerKey === 'credit_card' && accType === 'credit_card');

          if (accMatchesKeyword) {
            // High boost if matched specifically inside relevant section (e.g. "pake BCA" or "ke GoPay")
            const inRelevantSection = keywords.some((k) => relevantText.includes(k));
            score += inRelevantSection ? 200 : 100;
          }
        }
      }

      // Context-aware defaults when no explicit name is mentioned
      if (score === 0) {
        if (txType === 'income') {
          if (accType === 'bank') score += 20;
        } else if (txType === 'expense') {
          // If transaction has small daily keywords (makan, warung, parkir, kopi), prefer cash/e-wallet
          if (/makan|warung|kopi|jajan|parkir|bensin|rokok|mie/i.test(rawLower)) {
            if (accType === 'cash' || accType === 'e-wallet') score += 25;
          } else {
            if (accType === 'bank' || accType === 'e-wallet') score += 15;
          }
        }
      }

      return { account: acc, score };
    });

    scoredAccounts.sort((a, b) => b.score - a.score);

    if (scoredAccounts.length > 0 && scoredAccounts[0].score > 0) {
      return scoredAccounts[0].account;
    }

    if (txType === 'income') {
      const bank = accountsList.find((a) => a.type === 'bank');
      if (bank) return bank;
    } else {
      const cash = accountsList.find((a) => a.type === 'cash' || a.provider === 'cash');
      if (cash) return cash;
    }

    return accountsList[0];
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

      // Resolve and normalize account names exactly matching user's accounts
      const processedTransactions = (result.transactions || []).map((txData) => {
        const sourceAcc = resolveAccountFromChat(
          txData.accountName,
          text,
          accounts,
          txData.type,
          false
        );

        let destAcc: Account | undefined = undefined;
        if (txData.type === 'transfer') {
          destAcc = resolveAccountFromChat(
            txData.destinationAccountName || '',
            text,
            accounts.filter((a) => a.id !== sourceAcc.id),
            'transfer',
            true
          );
        }

        return {
          ...txData,
          accountName: sourceAcc.name,
          destinationAccountName: destAcc ? destAcc.name : txData.destinationAccountName,
          _resolvedSourceAccountId: sourceAcc.id,
          _resolvedDestAccountId: destAcc?.id,
        };
      });

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: result.aiReply,
        timestamp: new Date().toISOString(),
        parsedTransactions: processedTransactions.map(({ _resolvedSourceAccountId, _resolvedDestAccountId, ...rest }) => rest),
        financialInsight: result.financialInsight,
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      onSaveChatMessage(aiMsg);

      // Automatically save parsed transactions directly to database using exact resolved accounts
      if (processedTransactions.length > 0) {
        processedTransactions.forEach((txData) => {
          onAddTransaction({
            date: txData.date || new Date().toISOString().split('T')[0],
            title: txData.title,
            amount: txData.amount,
            type: txData.type,
            category: txData.category,
            accountId: txData._resolvedSourceAccountId,
            destinationAccountId: txData._resolvedDestAccountId,
            paymentMethod: `AI Chat (${txData.accountName})`,
            source: 'ai_chat',
            notes: txData.notes || `Dicatat via AI Chat: ${txData.title}`,
            tags: txData.tags && txData.tags.length > 0 ? txData.tags : ['AI-Chat'],
            isVerified: true,
          });
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm shrink-0 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <BotMessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white">ArthaAI Financial Assistant</h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                Gemini 3.7 Flash
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Ketik catatan pengeluaran, pemasukan, atau tanya kondisi keuangan. Data transaksi otomatis dicatat langsung!
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 overflow-y-auto space-y-4 shadow-sm transition-colors">
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
                    ? 'bg-slate-800 dark:bg-slate-700 text-white'
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
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-none font-medium'
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
                          className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Otomatis Tersimpan</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isExpense
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-800'
                                  : isIncome
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800'
                                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800'
                              }`}
                            >
                              {tx.type.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-900 dark:text-white text-xs truncate mr-2">
                              {tx.title}
                            </div>
                            <div
                              className={`font-black text-sm ${
                                isExpense
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isIncome
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {formatRupiah(tx.amount)}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700 font-medium">
                            <div>
                              <span className="text-slate-400 dark:text-slate-500">Kategori: </span>
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">{tx.category}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-slate-500">Tanggal: </span>
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">{formatDateIndo(tx.date)}</span>
                            </div>
                            {tx.type === 'transfer' ? (
                              <>
                                <div>
                                  <span className="text-slate-400 dark:text-slate-500">Dari: </span>
                                  <span className="text-rose-700 dark:text-rose-300 font-semibold">{tx.accountName}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 dark:text-slate-500">Ke: </span>
                                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{tx.destinationAccountName || 'Rekening Tujuan'}</span>
                                </div>
                              </>
                            ) : (
                              <div className="col-span-2">
                                <span className="text-slate-400 dark:text-slate-500">{isIncome ? 'Masuk ke: ' : 'Dipotong dari: '}</span>
                                <span className="text-indigo-700 dark:text-indigo-300 font-semibold">{tx.accountName}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-1">
                            <div className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
                              <div className="flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Tersimpan di Saldo Akun & Catatan</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-Sync</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Financial Insight Pill */}
                {msg.financialInsight && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 font-medium flex items-start gap-2.5 shadow-xs">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
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
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>ArthaAI sedang mencatat & menganalisis transaksi Anda...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0 mr-1 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Contoh:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            disabled={isProcessing}
            className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-2.5 shadow-sm shrink-0 flex items-center gap-2 transition-colors">
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
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/90 focus:bg-white dark:focus:bg-slate-800 rounded-2xl border border-transparent focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-slate-900 dark:text-white"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isProcessing}
          className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </div>
    </div>
  );
};
