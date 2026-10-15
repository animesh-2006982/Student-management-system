
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./income-expense.module.css";

type TransactionType = "income" | "expense";
type TabType = "all" | TransactionType;

type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: TransactionType;
  note: string;
};

const incomeCategories = [
  "Fees Collection",
  "Admission",
  "Donation",
  "Other Income",
];

const expenseCategories = [
  "Salary",
  "Transport",
  "Electricity",
  "Stationery",
  "Maintenance",
  "Other Expense",
];

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalMonth() {
  return getLocalDate().slice(0, 7);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function downloadCSV(records: Transaction[]) {
  const headers = [
    "ID",
    "Title",
    "Category",
    "Date",
    "Type",
    "Amount",
    "Note",
  ];

  const escapeCSV = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;

  const rows = records.map((item) =>
    [
      item.id,
      item.title,
      item.category,
      item.date,
      item.type,
      item.amount,
      item.note,
    ]
      .map(escapeCSV)
      .join(",")
  );

  const csv = [headers.map(escapeCSV).join(","), ...rows].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `study-arena-transactions-${getLocalDate()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function IncomeExpensePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [modalType, setModalType] = useState<TransactionType | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    incomeCategories[0]
  );
  const [date, setDate] = useState(getLocalDate());
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supabase = useMemo(() => createClient(), []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please login first.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.institute_id) {
        throw new Error("Unable to find your institute profile.");
      }

      const [incomeResult, expenseResult] = await Promise.all([
        supabase
          .from("income")
          .select(
            "id, title, category, amount, income_date, description, created_at"
          )
          .eq("institute_id", profile.institute_id)
          .order("income_date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("expenses")
          .select(
            "id, title, category, amount, expense_date, description, created_at"
          )
          .eq("institute_id", profile.institute_id)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (expenseResult.error) throw expenseResult.error;

      const incomeRecords: Transaction[] = (incomeResult.data ?? []).map(
        (item) => ({
          id: String(item.id),
          title: item.title ?? "Untitled income",
          category: item.category ?? "Other Income",
          amount: Number(item.amount ?? 0),
          date: item.income_date ?? "",
          type: "income",
          note: item.description ?? "",
        })
      );

      const expenseRecords: Transaction[] = (expenseResult.data ?? []).map(
        (item) => ({
          id: String(item.id),
          title: item.title ?? "Untitled expense",
          category: item.category ?? "Other Expense",
          amount: Number(item.amount ?? 0),
          date: item.expense_date ?? "",
          type: "expense",
          note: item.description ?? "",
        })
      );

      const combined = [...incomeRecords, ...expenseRecords].sort(
        (a, b) => b.date.localeCompare(a.date)
      );

      setTransactions(combined);
    } catch (err) {
      console.error("Income/expense loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load financial records."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const openModal = (type: TransactionType) => {
    setModalType(type);
    setTitle("");
    setAmount("");
    setSelectedCategory(
      type === "income" ? incomeCategories[0] : expenseCategories[0]
    );
    setDate(getLocalDate());
    setNote("");
    setError("");
    setSuccess("");
  };

  const closeModal = () => {
    if (!saving) setModalType(null);
  };

  const scrollToTransactions = (tab: TabType) => {
    setActiveTab(tab);
    window.setTimeout(() => {
      document
        .getElementById("transactions")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving || !modalType) return;

    const numericAmount = Number(amount);

    if (!title.trim()) {
      setError("Please enter a transaction title.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter an amount greater than zero.");
      return;
    }

    if (!date) {
      setError("Please select a transaction date.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please login first.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.institute_id) {
        throw new Error("Unable to find your institute.");
      }

      const payload = {
        institute_id: profile.institute_id,
        title: title.trim(),
        category: selectedCategory,
        amount: numericAmount,
        payment_method: null,
        reference_number: null,
        description: note.trim() || null,
        created_by: user.id,
      };

      if (modalType === "income") {
        const { error: insertError } = await supabase.from("income").insert({
          ...payload,
          income_date: date,
        });

        if (insertError) throw insertError;
      } else {
        const { error: insertError } = await supabase.from("expenses").insert({
          ...payload,
          expense_date: date,
        });

        if (insertError) throw insertError;
      }

      const savedType = modalType;
      setModalType(null);
      setSuccess(
        savedType === "income"
          ? "Income saved successfully."
          : "Expense saved successfully."
      );

      await loadTransactions();
    } catch (err) {
      console.error("Transaction save error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to save transaction."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (transaction: Transaction) => {
    const confirmed = window.confirm(
      `Delete "${transaction.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(transaction.id);
    setError("");
    setSuccess("");

    try {
      const table = transaction.type === "income" ? "income" : "expenses";

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("id", transaction.id);

      if (deleteError) throw deleteError;

      setTransactions((current) =>
        current.filter((item) => item.id !== transaction.id)
      );

      setSuccess("Transaction deleted successfully.");
    } catch (err) {
      console.error("Transaction delete error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to delete transaction."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const currentMonth = getLocalMonth();
  const today = getLocalDate();

  const totalIncome = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            item.type === "income" && item.date.startsWith(currentMonth)
        )
        .reduce((sum, item) => sum + item.amount, 0),
    [transactions, currentMonth]
  );

  const totalExpense = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            item.type === "expense" && item.date.startsWith(currentMonth)
        )
        .reduce((sum, item) => sum + item.amount, 0),
    [transactions, currentMonth]
  );

  const todayIncome = useMemo(
    () =>
      transactions
        .filter((item) => item.type === "income" && item.date === today)
        .reduce((sum, item) => sum + item.amount, 0),
    [transactions, today]
  );

  const todayExpense = useMemo(
    () =>
      transactions
        .filter((item) => item.type === "expense" && item.date === today)
        .reduce((sum, item) => sum + item.amount, 0),
    [transactions, today]
  );

  const filteredTransactions = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return transactions.filter((item) => {
      const matchesTab = activeTab === "all" || item.type === activeTab;

      const matchesSearch =
        !searchText ||
        item.title.toLowerCase().includes(searchText) ||
        item.category.toLowerCase().includes(searchText) ||
        item.note.toLowerCase().includes(searchText) ||
        item.date.includes(searchText);

      const matchesCategory =
        category === "all" || item.category === category;

      return matchesTab && matchesSearch && matchesCategory;
    });
  }, [transactions, activeTab, search, category]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set([
          ...incomeCategories,
          ...expenseCategories,
          ...transactions.map((item) => item.category),
        ])
      ),
    [transactions]
  );

  const recentIncome = transactions
    .filter((item) => item.type === "income")
    .slice(0, 5);

  const recentExpenses = transactions
    .filter((item) => item.type === "expense")
    .slice(0, 5);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.breadcrumb}>
            <span>Finance</span>
            <b>/</b>
            <strong>Income &amp; Expense</strong>
          </div>

          <div className={styles.titleRow}>
            <div className={styles.titleIcon}>₹</div>
            <div>
              <h1>Income &amp; Expense</h1>
              <p>Manage your institution&apos;s financial transactions.</p>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.incomeButton}
            onClick={() => openModal("income")}
          >
            <span>+</span> Add Income
          </button>

          <button
            type="button"
            className={styles.expenseButton}
            onClick={() => openModal("expense")}
          >
            <span>−</span> Add Expense
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className={styles.errorMessage}>
          <strong>Something went wrong</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div role="status" className={styles.successMessage}>
          {success}
          <button type="button" onClick={() => setSuccess("")}>
            Dismiss
          </button>
        </div>
      )}

      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.incomeCard}`}>
          <div className={styles.statTop}>
            <span>This Month Income</span>
            <div className={styles.statIcon}>↓</div>
          </div>
          <strong>{formatMoney(totalIncome)}</strong>
          <small>Income recorded this month</small>
          <button
            type="button"
            onClick={() => scrollToTransactions("income")}
          >
            View Details →
          </button>
        </div>

        <div className={`${styles.statCard} ${styles.expenseCard}`}>
          <div className={styles.statTop}>
            <span>This Month Expense</span>
            <div className={styles.statIcon}>↑</div>
          </div>
          <strong>{formatMoney(totalExpense)}</strong>
          <small>Expenses recorded this month</small>
          <button
            type="button"
            onClick={() => scrollToTransactions("expense")}
          >
            View Details →
          </button>
        </div>

        <div className={`${styles.statCard} ${styles.profitCard}`}>
          <div className={styles.statTop}>
            <span>Profit / Balance</span>
            <div className={styles.statIcon}>↔</div>
          </div>
          <strong>{formatMoney(totalIncome - totalExpense)}</strong>
          <small>Monthly income minus expenses</small>
          <button
            type="button"
            onClick={() => scrollToTransactions("all")}
          >
            Full Report →
          </button>
        </div>
      </section>

      <section className={styles.todayGrid}>
        <div className={styles.todayCard}>
          <div>
            <span>Today&apos;s Income</span>
            <strong>{formatMoney(todayIncome)}</strong>
          </div>
          <div className={styles.calendarIcon}>▣</div>
        </div>

        <div className={styles.todayCard}>
          <div>
            <span>Today&apos;s Expense</span>
            <strong>{formatMoney(todayExpense)}</strong>
          </div>
          <div className={styles.calendarIcon}>▣</div>
        </div>
      </section>

      <section className={styles.recentGrid}>
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <div>
              <h2>
                <span className={styles.incomeDot}>↙</span> Recent Income
              </h2>
              <p>Latest income transactions</p>
            </div>
            <button
              type="button"
              onClick={() => scrollToTransactions("income")}
            >
              View All
            </button>
          </div>

          <div className={styles.recentList}>
            {loading ? (
              <div className={styles.emptyRecent}>Loading income records…</div>
            ) : recentIncome.length === 0 ? (
              <div className={styles.emptyRecent}>
                <div>₹</div>
                <strong>No income records</strong>
                <span>Use Add Income to record a transaction.</span>
              </div>
            ) : (
              recentIncome.map((item) => (
                <div className={styles.recentItem} key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.category} • {item.date}
                    </span>
                  </div>
                  <b className={styles.incomeAmount}>
                    +{formatMoney(item.amount)}
                  </b>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <div>
              <h2>
                <span className={styles.expenseDot}>↗</span> Recent Expense
              </h2>
              <p>Latest expense transactions</p>
            </div>
            <button
              type="button"
              onClick={() => scrollToTransactions("expense")}
            >
              View All
            </button>
          </div>

          <div className={styles.recentList}>
            {loading ? (
              <div className={styles.emptyRecent}>
                Loading expense records…
              </div>
            ) : recentExpenses.length === 0 ? (
              <div className={styles.emptyRecent}>
                <div>₹</div>
                <strong>No expense records</strong>
                <span>Use Add Expense to record a transaction.</span>
              </div>
            ) : (
              recentExpenses.map((item) => (
                <div className={styles.recentItem} key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.category} • {item.date}
                    </span>
                  </div>
                  <b className={styles.expenseAmount}>
                    −{formatMoney(item.amount)}
                  </b>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className={styles.categoryGrid}>
        <div className={styles.categoryCard}>
          <div className={styles.categoryTitle}>
            <span>↙</span>
            <div>
              <h2>Income Overview</h2>
              <p>Total income across all records</p>
            </div>
          </div>
          <div className={styles.categoryEmpty}>
            <strong>
              {formatMoney(
                transactions
                  .filter((item) => item.type === "income")
                  .reduce((sum, item) => sum + item.amount, 0)
              )}
            </strong>
            <span>
              {transactions.filter((item) => item.type === "income").length}{" "}
              income records
            </span>
          </div>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.categoryTitle}>
            <span>↗</span>
            <div>
              <h2>Expense Overview</h2>
              <p>Total expenses across all records</p>
            </div>
          </div>
          <div className={styles.categoryEmpty}>
            <strong>
              {formatMoney(
                transactions
                  .filter((item) => item.type === "expense")
                  .reduce((sum, item) => sum + item.amount, 0)
              )}
            </strong>
            <span>
              {transactions.filter((item) => item.type === "expense").length}{" "}
              expense records
            </span>
          </div>
        </div>
      </section>

      <section
        className={styles.transactionsCard}
        id="transactions"
      >
        <div className={styles.transactionsHeader}>
          <div>
            <span className={styles.sectionLabel}>FINANCE MANAGEMENT</span>
            <h2>All Transactions</h2>
            <p>Search, filter, export and manage financial records.</p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.recordButton}
              onClick={() => openModal("income")}
            >
              + Record Income
            </button>
            <button
              type="button"
              className={styles.recordButton}
              onClick={() => openModal("expense")}
            >
              − Record Expense
            </button>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.tabs}>
            {(["all", "income", "expense"] as TabType[]).map((tab) => (
              <button
                type="button"
                key={tab}
                className={activeTab === tab ? styles.activeTab : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "all"
                  ? `All (${transactions.length})`
                  : tab === "income"
                    ? "Income"
                    : "Expense"}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={styles.select}
          >
            <option value="all">All Categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <div className={styles.searchBox}>
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search transactions…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.recordButton}
            onClick={() => void loadTransactions()}
            disabled={loading}
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>

          <button
            type="button"
            className={styles.recordButton}
            onClick={() => downloadCSV(filteredTransactions)}
            disabled={filteredTransactions.length === 0}
          >
            ↓ Export CSV
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>DESCRIPTION</th>
                <th>CATEGORY</th>
                <th>DATE</th>
                <th>TYPE</th>
                <th>AMOUNT</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.tableEmpty}>
                    Loading transactions from Supabase…
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.tableEmpty}>
                    No transactions found. Try changing the filters or add a
                    transaction.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item) => (
                  <tr key={`${item.type}-${item.id}`}>
                    <td>#{item.id.slice(-4)}</td>
                    <td>
                      <strong>{item.title}</strong>
                      {item.note && <small>{item.note}</small>}
                    </td>
                    <td>{item.category}</td>
                    <td>{item.date}</td>
                    <td>
                      <span
                        className={
                          item.type === "income"
                            ? styles.incomeBadge
                            : styles.expenseBadge
                        }
                      >
                        {item.type === "income" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td
                      className={
                        item.type === "income"
                          ? styles.incomeAmount
                          : styles.expenseAmount
                      }
                    >
                      {item.type === "income" ? "+" : "−"}
                      {formatMoney(item.amount)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        disabled={deletingId === item.id}
                        onClick={() => void deleteTransaction(item)}
                      >
                        {deletingId === item.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className={styles.resultsCount}>
          Showing {filteredTransactions.length} of {transactions.length}{" "}
          transactions
        </p>
      </section>

      {modalType && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span
                  className={
                    modalType === "income"
                      ? styles.modalIncomeIcon
                      : styles.modalExpenseIcon
                  }
                >
                  {modalType === "income" ? "+" : "−"}
                </span>
                <div>
                  <h2 id="transaction-modal-title">
                    Add {modalType === "income" ? "Income" : "Expense"}
                  </h2>
                  <p>Enter the transaction details below.</p>
                </div>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <label>
                Title
                <input
                  required
                  maxLength={150}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    modalType === "income"
                      ? "e.g. Student Fees"
                      : "e.g. Electricity Bill"
                  }
                />
              </label>

              <label>
                Amount (₹)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                />
              </label>

              <div className={styles.formRow}>
                <label>
                  Category
                  <select
                    required
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value)
                    }
                  >
                    {(modalType === "income"
                      ? incomeCategories
                      : expenseCategories
                    ).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Date
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>
              </div>

              <label>
                Note (optional)
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add any additional details…"
                  rows={3}
                />
              </label>

              {error && (
                <div role="alert" className={styles.errorMessage}>
                  {error}
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    modalType === "income"
                      ? styles.saveIncome
                      : styles.saveExpense
                  }
                  disabled={saving}
                >
                  {saving
                    ? "Saving…"
                    : `Save ${modalType === "income" ? "Income" : "Expense"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
