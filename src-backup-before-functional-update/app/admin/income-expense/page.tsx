"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./income-expense.module.css";

type TransactionType = "income" | "expense";

type Transaction = {
  id: number;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: TransactionType;
  note: string;
};

const initialTransactions: Transaction[] = [];

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

export default function IncomeExpensePage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);

  const [activeTab, setActiveTab] = useState<"all" | TransactionType>("all");

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("all");

  const [modalType, setModalType] =
    useState<TransactionType | null>(null);

  const [title, setTitle] = useState("");

  const [amount, setAmount] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [note, setNote] = useState("");

  const totalIncome = useMemo(() => {
    return transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [transactions]);

  const profit = totalIncome - totalExpense;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const matchesTab =
        activeTab === "all" || item.type === activeTab;

      const matchesSearch =
        item.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.category
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        category === "all" || item.category === category;

      return matchesTab && matchesSearch && matchesCategory;
    });
  }, [transactions, activeTab, search, category]);

  const openModal = (type: TransactionType) => {
    setModalType(type);

    setTitle("");

    setAmount("");

    setSelectedCategory(
      type === "income"
        ? incomeCategories[0]
        : expenseCategories[0]
    );

    setDate(new Date().toISOString().split("T")[0]);

    setNote("");
  };

  const closeModal = () => {
    setModalType(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!title.trim()) {
      alert("Please enter a title.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!modalType) return;

    const newTransaction: Transaction = {
      id: Date.now(),
      title: title.trim(),
      category: selectedCategory,
      amount: numericAmount,
      date,
      type: modalType,
      note: note.trim(),
    };

    setTransactions((current) => [
      newTransaction,
      ...current,
    ]);

    closeModal();
  };

  const deleteTransaction = (id: number) => {
    setTransactions((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const formatMoney = (value: number) => {
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const categories = Array.from(
    new Set([
      ...incomeCategories,
      ...expenseCategories,
      ...transactions.map((item) => item.category),
    ])
  );

  return (
    <main className={styles.page}>

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.breadcrumb}>
            <span>Finance</span>
            <b>/</b>
            <strong>Income & Expense</strong>
          </div>

          <div className={styles.titleRow}>
            <div className={styles.titleIcon}>₹</div>

            <div>
              <h1>Income & Expense</h1>
              <p>Manage your institution's financial transactions.</p>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.incomeButton}
            onClick={() => openModal("income")}
          >
            <span>+</span>
            Add Income
          </button>

          <button
            type="button"
            className={styles.expenseButton}
            onClick={() => openModal("expense")}
          >
            <span>−</span>
            Add Expense
          </button>
        </div>
      </header>

      {/* STAT CARDS */}
      <section className={styles.statsGrid}>

        <div className={`${styles.statCard} ${styles.incomeCard}`}>
          <div className={styles.statTop}>
            <span>This Month Income</span>
            <div className={styles.statIcon}>↓</div>
          </div>

          <strong>{formatMoney(totalIncome)}</strong>

          <small>All income records</small>

          <button
            type="button"
            onClick={() => setActiveTab("income")}
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

          <small>All expense records</small>

          <button
            type="button"
            onClick={() => setActiveTab("expense")}
          >
            View Details →
          </button>
        </div>

        <div className={`${styles.statCard} ${styles.profitCard}`}>
          <div className={styles.statTop}>
            <span>Profit / Balance</span>
            <div className={styles.statIcon}>⌁</div>
          </div>

          <strong>{formatMoney(profit)}</strong>

          <small>
            Income minus expenses
          </small>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
          >
            Full Report →
          </button>
        </div>

      </section>

      {/* TODAY */}
      <section className={styles.todayGrid}>

        <div className={styles.todayCard}>
          <div>
            <span>Today&apos;s Income</span>
            <strong>₹0.00</strong>
          </div>

          <div className={styles.calendarIcon}>▣</div>
        </div>

        <div className={styles.todayCard}>
          <div>
            <span>Today&apos;s Expense</span>
            <strong>₹0.00</strong>
          </div>

          <div className={styles.calendarIcon}>▣</div>
        </div>

      </section>

      {/* RECENT SECTION */}
      <section className={styles.recentGrid}>

        {/* RECENT INCOME */}
        <div className={styles.listCard}>

          <div className={styles.listHeader}>
            <div>
              <h2>
                <span className={styles.incomeDot}>↙</span>
                Recent Income
              </h2>

              <p>Latest income transactions</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab("income");
                window.scrollTo({
                  top: document.body.scrollHeight,
                  behavior: "smooth",
                });
              }}
            >
              View All
            </button>
          </div>

          <div className={styles.recentList}>
            {transactions.filter(
              (item) => item.type === "income"
            ).length === 0 ? (
              <div className={styles.emptyRecent}>
                <div>₹</div>
                <strong>No income records</strong>
                <span>
                  Income transactions will appear here.
                </span>
              </div>
            ) : (
              transactions
                .filter((item) => item.type === "income")
                .slice(0, 5)
                .map((item) => (
                  <div
                    className={styles.recentItem}
                    key={item.id}
                  >
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

        {/* RECENT EXPENSE */}
        <div className={styles.listCard}>

          <div className={styles.listHeader}>
            <div>
              <h2>
                <span className={styles.expenseDot}>↗</span>
                Recent Expense
              </h2>

              <p>Latest expense transactions</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab("expense");
                window.scrollTo({
                  top: document.body.scrollHeight,
                  behavior: "smooth",
                });
              }}
            >
              View All
            </button>
          </div>

          <div className={styles.recentList}>
            {transactions.filter(
              (item) => item.type === "expense"
            ).length === 0 ? (
              <div className={styles.emptyRecent}>
                <div>₹</div>
                <strong>No expense records</strong>
                <span>
                  Expense transactions will appear here.
                </span>
              </div>
            ) : (
              transactions
                .filter((item) => item.type === "expense")
                .slice(0, 5)
                .map((item) => (
                  <div
                    className={styles.recentItem}
                    key={item.id}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {item.category} • {item.date}
                      </span>
                    </div>

                    <b className={styles.expenseAmount}>
                      -{formatMoney(item.amount)}
                    </b>
                  </div>
                ))
            )}
          </div>

        </div>

      </section>

      {/* CATEGORY */}
      <section className={styles.categoryGrid}>

        <div className={styles.categoryCard}>
          <div className={styles.categoryTitle}>
            <span>↙</span>
            <div>
              <h2>Income by Category</h2>
              <p>Income distribution</p>
            </div>
          </div>

          <div className={styles.categoryEmpty}>
            <strong>₹0</strong>
            <span>No income data available</span>
          </div>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.categoryTitle}>
            <span>↗</span>
            <div>
              <h2>Expense by Category</h2>
              <p>Expense distribution</p>
            </div>
          </div>

          <div className={styles.categoryEmpty}>
            <strong>₹0</strong>
            <span>No expense data available</span>
          </div>
        </div>

      </section>

      {/* TRANSACTIONS */}
      <section
        className={styles.transactionsCard}
        id="transactions"
      >

        <div className={styles.transactionsHeader}>
          <div>
            <span className={styles.sectionLabel}>
              FINANCE MANAGEMENT
            </span>

            <h2>All Transactions</h2>

            <p>
              View and manage income and expense records.
            </p>
          </div>

          <button
            type="button"
            className={styles.recordButton}
            onClick={() => openModal("income")}
          >
            + Record Transaction
          </button>
        </div>

        {/* FILTERS */}
        <div className={styles.filters}>

          <div className={styles.tabs}>

            <button
              type="button"
              className={
                activeTab === "all"
                  ? styles.activeTab
                  : ""
              }
              onClick={() => setActiveTab("all")}
            >
              All
              <span>{transactions.length}</span>
            </button>

            <button
              type="button"
              className={
                activeTab === "income"
                  ? styles.activeTab
                  : ""
              }
              onClick={() => setActiveTab("income")}
            >
              Income
            </button>

            <button
              type="button"
              className={
                activeTab === "expense"
                  ? styles.activeTab
                  : ""
              }
              onClick={() => setActiveTab("expense")}
            >
              Expense
            </button>

          </div>

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
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
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

        </div>

        {/* TABLE */}
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

              {filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className={styles.tableEmpty}
                  >
                    <div>
                      <span>₹</span>
                      <strong>
                        No transactions found
                      </strong>
                      <small>
                        Your income and expense records
                        will appear here.
                      </small>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item) => (
                  <tr key={item.id}>

                    <td>
                      #{String(item.id).slice(-4)}
                    </td>

                    <td>
                      <strong>{item.title}</strong>

                      {item.note && (
                        <small>{item.note}</small>
                      )}
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
                        {item.type === "income"
                          ? "Income"
                          : "Expense"}
                      </span>
                    </td>

                    <td
                      className={
                        item.type === "income"
                          ? styles.incomeAmount
                          : styles.expenseAmount
                      }
                    >
                      {item.type === "income"
                        ? "+"
                        : "-"}
                      {formatMoney(item.amount)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() =>
                          deleteTransaction(item.id)
                        }
                      >
                        Delete
                      </button>
                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* MODAL */}
      {modalType && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >

          <div className={styles.modal}>

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
                  <h2>
                    Add{" "}
                    {modalType === "income"
                      ? "Income"
                      : "Expense"}
                  </h2>

                  <p>
                    Enter transaction details below.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className={styles.form}
            >

              <label>
                Title
                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder={
                    modalType === "income"
                      ? "e.g. Student Fees"
                      : "e.g. Electricity Bill"
                }
                />
              </label>

              <label>
                Amount
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="₹ 0"
                />
              </label>

              <div className={styles.formRow}>

                <label>
                  Category
                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(
                        event.target.value
                      )
                    }
                  >
                    {(modalType === "income"
                      ? incomeCategories
                      : expenseCategories
                    ).map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Date
                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(event.target.value)
                    }
                  />
                </label>

              </div>

              <label>
                Note
                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  placeholder="Optional note..."
                  rows={3}
                />
              </label>

              <div className={styles.modalActions}>

                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeModal}
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
                >
                  Save{" "}
                  {modalType === "income"
                    ? "Income"
                    : "Expense"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </main>
  );
}