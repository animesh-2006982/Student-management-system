
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./library.module.css";

type Book = {
  id: string;
  institute_id: string;
  book_id: string;
  title: string;
  isbn?: string | null;
  author?: string | null;
  category?: string | null;
  total_copies: number;
  available_copies: number;
  fine_per_day: number;
  created_at?: string;
};

type Student = {
  id: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  admission_number?: string | null;
  batch_id?: string | null;
  status?: string | null;
};

type Issue = {
  id: string;
  institute_id: string;
  book_id: string;
  student_id: string;
  issue_date: string;
  due_date: string;
  return_date?: string | null;
  status: "Issued" | "Returned" | "Overdue";
  fine_amount: number;
  notes?: string | null;
  created_at?: string;
};

const supabase = createClient();

function studentName(student?: Student) {
  if (!student) return "Unknown Student";

  return (
    [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unknown Student"
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function daysLate(dueDate: string, returnDate?: string | null) {
  const end = new Date(
    `${returnDate || today()}T00:00:00`
  ).getTime();

  const due = new Date(
    `${dueDate}T00:00:00`
  ).getTime();

  return Math.max(
    Math.floor((end - due) / 86400000),
    0
  );
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [activeTab, setActiveTab] =
    useState<"books" | "issues">("books");

  const [bookModal, setBookModal] =
    useState(false);
  const [issueModal, setIssueModal] =
    useState(false);
  const [returnModal, setReturnModal] =
    useState<Issue | null>(null);
  const [editingIssue, setEditingIssue] =
    useState<Issue | null>(null);

  const [editingBook, setEditingBook] =
    useState<Book | null>(null);

  const [bookForm, setBookForm] = useState({
    book_id: "",
    title: "",
    isbn: "",
    author: "",
    category: "",
    total_copies: "1",
    fine_per_day: "5",
  });

  const [issueForm, setIssueForm] = useState({
    book_id: "",
    student_id: "",
    issue_date: today(),
    due_date: "",
    notes: "",
  });

  const [returnDate, setReturnDate] =
    useState(today());

  const [editIssueForm, setEditIssueForm] =
    useState({
      book_id: "",
      student_id: "",
      issue_date: today(),
      due_date: "",
      submitted: false,
      return_date: "",
      notes: "",
    });

  const getInstituteId = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Please login first.");

    const { data, error: profileError } =
      await supabase
        .from("profiles")
        .select("institute_id")
        .eq("id", user.id)
        .single();

    if (profileError) throw profileError;

    if (!data?.institute_id) {
      throw new Error(
        "Institute profile not found."
      );
    }

    return data.institute_id as string;
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const instituteId =
        await getInstituteId();

      const [
        booksResult,
        studentsResult,
        issuesResult,
      ] = await Promise.all([
        supabase
          .from("library_books")
          .select("*")
          .eq("institute_id", instituteId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("students")
          .select(
            "id,first_name,middle_name,last_name,admission_number,batch_id,status"
          )
          .eq("institute_id", instituteId)
          .order("first_name", {
            ascending: true,
          }),

        supabase
          .from("library_issues")
          .select("*")
          .eq("institute_id", instituteId)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (booksResult.error)
        throw booksResult.error;

      if (studentsResult.error)
        throw studentsResult.error;

      if (issuesResult.error)
        throw issuesResult.error;

      setBooks(
        (booksResult.data || []) as Book[]
      );

      setStudents(
        (studentsResult.data || []) as Student[]
      );

      setIssues(
        (issuesResult.data || []) as Issue[]
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to load library data."
      );
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [getInstituteId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* =====================================================
     DERIVED DATA
  ===================================================== */

  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();

    books.forEach((book) =>
      map.set(book.id, book)
    );

    return map;
  }, [books]);

  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();

    students.forEach((student) =>
      map.set(student.id, student)
    );

    return map;
  }, [students]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        books
          .map((book) => book.category)
          .filter(Boolean)
      )
    ).sort() as string[];
  }, [books]);

  const totalCopies = books.reduce(
    (sum, book) =>
      sum + Number(book.total_copies || 0),
    0
  );

  const availableCopies = books.reduce(
    (sum, book) =>
      sum + Number(book.available_copies || 0),
    0
  );

  const issuedCount = issues.filter(
    (issue) =>
      issue.status === "Issued" ||
      issue.status === "Overdue"
  ).length;

  const overdueCount = issues.filter(
    (issue) =>
      issue.status === "Overdue" ||
      (
        issue.status !== "Returned" &&
        new Date(
          `${issue.due_date}T00:00:00`
        ) < new Date(`${today()}T00:00:00`)
      )
  ).length;

  const activeIssues = issues.map((issue) => {
    if (
      issue.status === "Issued" &&
      new Date(
        `${issue.due_date}T00:00:00`
      ) < new Date(`${today()}T00:00:00`)
    ) {
      return {
        ...issue,
        status: "Overdue" as const,
      };
    }

    return issue;
  });

  /*
   * Fine is calculated live for overdue books.
   * Returned books use the fine saved in Supabase.
   * This makes the Total Fine card update immediately
   * without waiting for a book to be returned.
   */
  const getLiveFine = useCallback(
    (issue: Issue) => {
      const savedFine = Number(
        issue.fine_amount || 0
      );

      if (issue.status === "Returned") {
        return savedFine;
      }

      const book = bookMap.get(issue.book_id);

      const lateDays = daysLate(
        issue.due_date,
        issue.return_date
      );

      const dailyFine = Number(
        book?.fine_per_day || 0
      );

      return Math.max(
        savedFine,
        lateDays * dailyFine
      );
    },
    [bookMap]
  );

  const totalFine = activeIssues.reduce(
    (sum, issue) =>
      sum + getLiveFine(issue),
    0
  );


  const getBookReturnStatus = useCallback(
    (bookId: string) => {
      const activeForBook = activeIssues.filter(
        (issue) =>
          issue.book_id === bookId &&
          issue.status !== "Returned"
      );

      const overdue = activeForBook.filter(
        (issue) => issue.status === "Overdue"
      ).length;

      const issued = activeForBook.filter(
        (issue) => issue.status === "Issued"
      ).length;

      if (overdue > 0 && issued > 0) {
        return {
          label: `Overdue (${overdue}) · Issued (${issued})`,
          className: styles.overdue,
        };
      }

      if (overdue > 0) {
        return {
          label: `Overdue (${overdue})`,
          className: styles.overdue,
        };
      }

      if (issued > 0) {
        return {
          label: `Issued (${issued})`,
          className: styles.issued,
        };
      }

      return {
        label: "Returned",
        className: styles.returned,
      };
    },
    [activeIssues]
  );

  const filteredBooks = books.filter((book) => {
    const query =
      search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      book.title
        .toLowerCase()
        .includes(query) ||
      book.book_id
        .toLowerCase()
        .includes(query) ||
      String(book.isbn || "")
        .toLowerCase()
        .includes(query) ||
      String(book.author || "")
        .toLowerCase()
        .includes(query);

    const matchesCategory =
      categoryFilter === "all" ||
      book.category === categoryFilter;

    return (
      matchesSearch &&
      matchesCategory
    );
  });

  const filteredIssues = activeIssues.filter(
    (issue) => {
      const book = bookMap.get(
        issue.book_id
      );

      const student = studentMap.get(
        issue.student_id
      );

      const query =
        search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        book?.title
          .toLowerCase()
          .includes(query) ||
        studentName(student)
          .toLowerCase()
          .includes(query) ||
        String(
          student?.admission_number || ""
        )
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        normalize(issue.status) ===
          normalize(statusFilter);

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );

  /* =====================================================
     BOOK MODAL
  ===================================================== */

  function openAddBook() {
    setEditingBook(null);

    setBookForm({
      book_id: "",
      title: "",
      isbn: "",
      author: "",
      category: "",
      total_copies: "1",
      fine_per_day: "5",
    });

    setBookModal(true);
  }

  function openEditBook(book: Book) {
    setEditingBook(book);

    setBookForm({
      book_id: book.book_id,
      title: book.title,
      isbn: book.isbn || "",
      author: book.author || "",
      category: book.category || "",
      total_copies: String(
        book.total_copies
      ),
      fine_per_day: String(
        book.fine_per_day
      ),
    });

    setBookModal(true);
  }

  async function saveBook(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const instituteId =
        await getInstituteId();

      const total =
        Math.max(
          Number(
            bookForm.total_copies
          ) || 0,
          0
        );

      const fine =
        Math.max(
          Number(
            bookForm.fine_per_day
          ) || 0,
          0
        );

      if (
        !bookForm.book_id.trim() ||
        !bookForm.title.trim()
      ) {
        throw new Error(
          "Book ID and title are required."
        );
      }

      if (total < 1) {
        throw new Error(
          "Total copies must be at least 1."
        );
      }

      if (editingBook) {
        const issuedCopies =
          editingBook.total_copies -
          editingBook.available_copies;

        if (total < issuedCopies) {
          throw new Error(
            `Total copies cannot be less than ${issuedCopies} currently issued copies.`
          );
        }

        const newAvailable =
          total - issuedCopies;

        const { error } =
          await supabase
            .from("library_books")
            .update({
              book_id:
                bookForm.book_id.trim(),
              title:
                bookForm.title.trim(),
              isbn:
                bookForm.isbn.trim() ||
                null,
              author:
                bookForm.author.trim() ||
                null,
              category:
                bookForm.category.trim() ||
                null,
              total_copies: total,
              available_copies:
                newAvailable,
              fine_per_day: fine,
            })
            .eq(
              "id",
              editingBook.id
            )
            .eq(
              "institute_id",
              instituteId
            );

        if (error) throw error;
      } else {
        const { error } =
          await supabase
            .from("library_books")
            .insert({
              institute_id:
                instituteId,
              book_id:
                bookForm.book_id.trim(),
              title:
                bookForm.title.trim(),
              isbn:
                bookForm.isbn.trim() ||
                null,
              author:
                bookForm.author.trim() ||
                null,
              category:
                bookForm.category.trim() ||
                null,
              total_copies: total,
              available_copies: total,
              fine_per_day: fine,
            });

        if (error) throw error;
      }

      setBookModal(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to save book."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteBook(book: Book) {
    const hasActiveIssue =
      issues.some(
        (issue) =>
          issue.book_id === book.id &&
          issue.status !== "Returned"
      );

    if (hasActiveIssue) {
      setError(
        "This book cannot be deleted while it is issued."
      );
      return;
    }

    if (
      !window.confirm(
        `Delete "${book.title}"?`
      )
    ) {
      return;
    }

    setError("");

    const { error } =
      await supabase
        .from("library_books")
        .delete()
        .eq("id", book.id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadData();
  }

  /* =====================================================
     ISSUE MODAL
  ===================================================== */

  function openIssueBook() {
    const firstAvailable =
      books.find(
        (book) =>
          book.available_copies > 0
      );

    setIssueForm({
      book_id:
        firstAvailable?.id || "",
      student_id: "",
      issue_date: today(),
      due_date: "",
      notes: "",
    });

    setIssueModal(true);
  }

  async function issueBook(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      if (
        !issueForm.book_id ||
        !issueForm.student_id
      ) {
        throw new Error(
          "Select a book and student."
        );
      }

      if (!issueForm.due_date) {
        throw new Error(
          "Select a due date."
        );
      }

      const { error } =
        await supabase.rpc(
          "issue_library_book",
          {
            p_book_id:
              issueForm.book_id,
            p_student_id:
              issueForm.student_id,
            p_issue_date:
              issueForm.issue_date,
            p_due_date:
              issueForm.due_date,
            p_notes:
              issueForm.notes.trim() ||
              null,
          }
        );

      if (error) throw error;

      setIssueModal(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to issue book."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     EDIT ISSUE / RETURN RECORD
  ===================================================== */

  function openEditIssue(issue: Issue) {
    setEditingIssue(issue);

    setEditIssueForm({
      book_id: issue.book_id,
      student_id: issue.student_id,
      issue_date: issue.issue_date,
      due_date: issue.due_date,
      submitted: issue.status === "Returned",
      return_date: issue.return_date || today(),
      notes: issue.notes || "",
    });
  }

  async function saveEditedIssue(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!editingIssue) return;

    setSaving(true);
    setError("");

    try {
      const oldActive =
        editingIssue.status !== "Returned";

      const newActive =
        !editIssueForm.submitted;

      const oldBook =
        bookMap.get(editingIssue.book_id);

      const newBook =
        bookMap.get(editIssueForm.book_id);

      if (!newBook) {
        throw new Error("Selected book was not found.");
      }

      if (!editIssueForm.student_id) {
        throw new Error("Select a student.");
      }

      if (!editIssueForm.book_id) {
        throw new Error("Select a book.");
      }

      if (!editIssueForm.due_date) {
        throw new Error("Due date is required.");
      }

      if (
        editIssueForm.due_date <
        editIssueForm.issue_date
      ) {
        throw new Error(
          "Due date cannot be before issue date."
        );
      }

      const newReturnDate =
        editIssueForm.submitted
          ? editIssueForm.return_date || today()
          : null;

      if (
        newReturnDate &&
        newReturnDate <
          editIssueForm.issue_date
      ) {
        throw new Error(
          "Return date cannot be before issue date."
        );
      }

      // If an active issue is moved to another book,
      // return the old copy first and take one from the new book.
      if (
        oldActive &&
        newActive &&
        editingIssue.book_id !==
          editIssueForm.book_id
      ) {
        if (newBook.available_copies <= 0) {
          throw new Error(
            "The selected new book has no available copies."
          );
        }

        const { error: oldBookError } =
          await supabase
            .from("library_books")
            .update({
              available_copies:
                Math.min(
                  oldBook
                    ? oldBook.available_copies + 1
                    : 0,
                  oldBook?.total_copies || 0
                ),
            })
            .eq("id", editingIssue.book_id);

        if (oldBookError) throw oldBookError;

        const { error: newBookError } =
          await supabase
            .from("library_books")
            .update({
              available_copies:
                newBook.available_copies - 1,
            })
            .eq("id", editIssueForm.book_id);

        if (newBookError) throw newBookError;
      }

      // Active -> Returned
      if (oldActive && !newActive) {
        const bookToReturn =
          oldBook || newBook;

        if (!bookToReturn) {
          throw new Error(
            "Original book was not found."
          );
        }

        const { error: bookError } =
          await supabase
            .from("library_books")
            .update({
              available_copies:
                Math.min(
                  bookToReturn.available_copies + 1,
                  bookToReturn.total_copies
                ),
            })
            .eq("id", bookToReturn.id);

        if (bookError) throw bookError;
      }

      // Returned -> Active
      if (!oldActive && newActive) {
        if (newBook.available_copies <= 0) {
          throw new Error(
            "No available copy is left for this book."
          );
        }

        const { error: bookError } =
          await supabase
            .from("library_books")
            .update({
              available_copies:
                newBook.available_copies - 1,
            })
            .eq("id", editIssueForm.book_id);

        if (bookError) throw bookError;
      }

      // If a returned issue changes its book,
      // stock does not need a change because it was already returned.
      // If an active issue changes only student/date, stock also stays unchanged.

      const finalStatus = editIssueForm.submitted
        ? "Returned"
        : (
            new Date(
              `${editIssueForm.due_date}T00:00:00`
            ) < new Date(`${today()}T00:00:00`)
              ? "Overdue"
              : "Issued"
          );

      const fine =
        editIssueForm.submitted
          ? daysLate(
              editIssueForm.due_date,
              newReturnDate
            ) *
            Number(newBook.fine_per_day || 0)
          : 0;

      const { error: updateError } =
        await supabase
          .from("library_issues")
          .update({
            book_id:
              editIssueForm.book_id,
            student_id:
              editIssueForm.student_id,
            issue_date:
              editIssueForm.issue_date,
            due_date:
              editIssueForm.due_date,
            return_date:
              newReturnDate,
            status: finalStatus,
            fine_amount: fine,
            notes:
              editIssueForm.notes.trim() ||
              null,
          })
          .eq("id", editingIssue.id);

      if (updateError) throw updateError;

      setEditingIssue(null);
      await loadData(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to update issue record."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     RETURN
  ===================================================== */

  function openReturn(issue: Issue) {
    setReturnDate(today());
    setReturnModal(issue);
  }

  async function returnBook() {
    if (!returnModal) return;

    setSaving(true);
    setError("");

    try {
      const { error } =
        await supabase.rpc(
          "return_library_book",
          {
            p_issue_id:
              returnModal.id,
            p_return_date:
              returnDate,
          }
        );

      if (error) throw error;

      setReturnModal(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to return book."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            LIBRARY
          </span>

          <h1>Library</h1>

          <p>
            Manage books, issue/return records
            and student library activity.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={refreshing}
            onClick={() => {
              void loadData(true);
            }}
          >
            {refreshing ? "↻ Refreshing..." : "↻ Refresh"}
          </button>

          <button
            className={styles.primaryButton}
            onClick={openAddBook}
          >
            + Add Book
          </button>

          <button
            className={styles.issueButton}
            onClick={openIssueBook}
          >
            ⇧ Issue Book
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}

          <button
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {/* =================================================
          STATS
      ================================================= */}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total Books</span>
          <strong>{books.length}</strong>
          <small>Book titles</small>
        </div>

        <div className={styles.statCard}>
          <span>Total Copies</span>
          <strong>{totalCopies}</strong>
          <small>All library copies</small>
        </div>

        <div className={styles.statCard}>
          <span>Available</span>
          <strong>{availableCopies}</strong>
          <small>Ready to issue</small>
        </div>

        <div className={styles.statCard}>
          <span>Issued</span>
          <strong>{issuedCount}</strong>
          <small>Currently with students</small>
        </div>

        <div className={styles.statCard}>
          <span>Overdue</span>
          <strong>{overdueCount}</strong>
          <small>Need attention</small>
        </div>

        <div className={styles.statCard}>
          <span>Total Fine</span>
          <strong>{money(totalFine)}</strong>
          <small>Recorded fines</small>
        </div>
      </section>

      {/* =================================================
          TABS
      ================================================= */}

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <button
            className={
              activeTab === "books"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              setActiveTab("books")
            }
          >
            📚 Books
          </button>

          <button
            className={
              activeTab === "issues"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              setActiveTab("issues")
            }
          >
            ⇧ Issue / Return
          </button>
        </div>

        <div className={styles.filters}>
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder={
              activeTab === "books"
                ? "Search books, ISBN, author..."
                : "Search student or book..."
            }
          />

          {activeTab === "books" ? (
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Categories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>
          ) : (
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Status
              </option>

              <option value="Issued">
                Issued
              </option>

              <option value="Overdue">
                Overdue
              </option>

              <option value="Returned">
                Returned
              </option>
            </select>
          )}
        </div>
      </div>

      {/* =================================================
          BOOK TABLE
      ================================================= */}

      {activeTab === "books" && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Book Catalogue</h2>
              <span>
                {filteredBooks.length} book
                {filteredBooks.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <button
              className={styles.smallPrimary}
              onClick={openAddBook}
            >
              + Add Book
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Book</th>
                  <th>ISBN</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Copies</th>
                  <th>Taken</th>
                  <th>Available</th>
                  <th>Fine / Day</th>
                  <th>Return Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredBooks.map(
                  (book, index) => (
                    <tr key={book.id}>
                      <td>{index + 1}</td>

                      <td>
                        <strong>
                          {book.title}
                        </strong>

                        <small>
                          ID: {book.book_id}
                        </small>
                      </td>

                      <td>
                        {book.isbn || "—"}
                      </td>

                      <td>
                        {book.author || "—"}
                      </td>

                      <td>
                        {book.category || "—"}
                      </td>

                      <td>
                        {book.total_copies}
                      </td>

                      <td>
                        <span className={styles.taken}>
                          {Math.max(
                            Number(book.total_copies || 0) -
                              Number(book.available_copies || 0),
                            0
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            book.available_copies >
                            0
                              ? styles.available
                              : styles.unavailable
                          }
                        >
                          {book.available_copies}
                        </span>
                      </td>

                      <td>
                        {money(
                          Number(
                            book.fine_per_day
                          )
                        )}
                      </td>

                      <td>
                        {(() => {
                          const returnStatus =
                            getBookReturnStatus(book.id);

                          return (
                            <span
                              className={
                                returnStatus.className
                              }
                            >
                              {returnStatus.label}
                            </span>
                          );
                        })()}
                      </td>

                      <td>
                        <div
                          className={
                            styles.rowActions
                          }
                        >
                          <button
                            onClick={() =>
                              openEditBook(book)
                            }
                          >
                            Edit
                          </button>

                          <button
                            className={
                              styles.issueMini
                            }
                            disabled={
                              book.available_copies <=
                              0
                            }
                            onClick={() => {
                              setIssueForm({
                                book_id:
                                  book.id,
                                student_id:
                                  "",
                                issue_date:
                                  today(),
                                due_date:
                                  "",
                                notes: "",
                              });

                              setIssueModal(
                                true
                              );
                            }}
                          >
                            Issue
                          </button>

                          <button
                            className={
                              styles.deleteMini
                            }
                            onClick={() =>
                              void deleteBook(
                                book
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {!filteredBooks.length && (
                  <tr>
                    <td
                      colSpan={11}
                      className={styles.empty}
                    >
                      {loading
                        ? "Loading library..."
                        : "No books found. Add your first book."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =================================================
          ISSUE / RETURN TABLE
      ================================================= */}

      {activeTab === "issues" && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Issue & Return Register</h2>
              <span>
                Track every issued and returned
                book.
              </span>
            </div>

            <button
              className={styles.smallPrimary}
              onClick={openIssueBook}
            >
              + Issue Book
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Book</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Fine</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredIssues.map(
                  (issue, index) => {
                    const book =
                      bookMap.get(
                        issue.book_id
                      );

                    const student =
                      studentMap.get(
                        issue.student_id
                      );

                    const calculatedFine =
                      getLiveFine(issue);

                    return (
                      <tr key={issue.id}>
                        <td>
                          {index + 1}
                        </td>

                        <td>
                          <strong>
                            {studentName(
                              student
                            )}
                          </strong>

                          <small>
                            {student
                              ?.admission_number ||
                              "—"}
                          </small>
                        </td>

                        <td>
                          <strong>
                            {book?.title ||
                              "Unknown Book"}
                          </strong>

                          <small>
                            {book?.book_id ||
                              "—"}
                          </small>
                        </td>

                        <td>
                          {issue.issue_date}
                        </td>

                        <td>
                          {issue.due_date}
                        </td>

                        <td>
                          {issue.return_date ||
                            "—"}
                        </td>

                        <td>
                          {money(
                            calculatedFine
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              issue.status ===
                              "Returned"
                                ? styles.returned
                                : issue.status ===
                                    "Overdue"
                                  ? styles.overdue
                                  : styles.issued
                            }
                          >
                            {issue.status}
                          </span>
                        </td>

                        <td>
                          <div className={styles.rowActions}>
                            <button
                              onClick={() =>
                                openEditIssue(issue)
                              }
                            >
                              Edit
                            </button>

                            {issue.status !==
                              "Returned" && (
                              <button
                                className={
                                  styles.returnButton
                                }
                                onClick={() =>
                                  openReturn(
                                    issue
                                  )
                                }
                              >
                                Return
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}

                {!filteredIssues.length && (
                  <tr>
                    <td
                      colSpan={9}
                      className={styles.empty}
                    >
                      No issue/return records
                      found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =================================================
          BOOK MODAL
      ================================================= */}

      {bookModal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setBookModal(false);
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span>LIBRARY</span>
                <h2>
                  {editingBook
                    ? "Edit Book"
                    : "Add Book"}
                </h2>
              </div>

              <button
                onClick={() =>
                  setBookModal(false)
                }
              >
                ×
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={saveBook}
            >
              <div className={styles.formGrid}>
                <label>
                  Book ID *
                  <input
                    value={
                      bookForm.book_id
                    }
                    onChange={(event) =>
                      setBookForm(
                        (prev) => ({
                          ...prev,
                          book_id:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="BK-001"
                  />
                </label>

                <label>
                  ISBN
                  <input
                    value={
                      bookForm.isbn
                    }
                    onChange={(event) =>
                      setBookForm(
                        (prev) => ({
                          ...prev,
                          isbn:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="978..."
                  />
                </label>

                <label
                  className={
                    styles.full
                  }
                >
                  Book Title *
                  <input
                    value={
                      bookForm.title
                    }
                    onChange={(event) =>
                      setBookForm(
                        (prev) => ({
                          ...prev,
                          title:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Book title"
                  />
                </label>

                <label>
                  Author
                  <input
                    value={
                      bookForm.author
                    }
                    onChange={(event) =>
                      setBookForm(
                        (prev) => ({
                          ...prev,
                          author:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Author name"
                  />
                </label>

                <label>
                  Category
                  <input
                    value={
                      bookForm.category
                    }
                    onChange={(event) =>
                      setBookForm(
                        (prev) => ({
                          ...prev,
                          category:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Science, English..."
                  />
                </label>

                <label>
                  Total Copies *
                  <input
                    type="number"
                    min="1"
                    value={
                      bookForm.total_copies
                    }
                    onChange={(event) =>
                      setBookForm(
                        (prev) => ({
                          ...prev,
                          total_copies:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Fine / Day (₹)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      bookForm.fine_per_day
                    }
                    onChange={(event) =>
                      setBookForm(
                        (prev) => ({
                          ...prev,
                          fine_per_day:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>
              </div>

              <div
                className={
                  styles.modalFooter
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setBookModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingBook
                      ? "Update Book"
                      : "Save Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          ISSUE MODAL
      ================================================= */}

      {issueModal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIssueModal(false);
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span>LIBRARY</span>
                <h2>Issue Book</h2>
              </div>

              <button
                onClick={() =>
                  setIssueModal(false)
                }
              >
                ×
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={issueBook}
            >
              <div className={styles.formGrid}>
                <label
                  className={
                    styles.full
                  }
                >
                  Book *
                  <select
                    value={
                      issueForm.book_id
                    }
                    onChange={(event) =>
                      setIssueForm(
                        (prev) => ({
                          ...prev,
                          book_id:
                            event.target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="">
                      Select book
                    </option>

                    {books
                      .filter(
                        (book) =>
                          book.available_copies >
                          0
                      )
                      .map((book) => (
                        <option
                          key={
                            book.id
                          }
                          value={
                            book.id
                          }
                        >
                          {book.title} —{" "}
                          {
                            book.available_copies
                          } available
                        </option>
                      ))}
                  </select>
                </label>

                <label
                  className={
                    styles.full
                  }
                >
                  Student *
                  <select
                    value={
                      issueForm.student_id
                    }
                    onChange={(event) =>
                      setIssueForm(
                        (prev) => ({
                          ...prev,
                          student_id:
                            event.target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="">
                      Select student
                    </option>

                    {students
                      .filter(
                        (student) =>
                          normalize(
                            student.status
                          ) !==
                          "inactive"
                      )
                      .map(
                        (student) => (
                          <option
                            key={
                              student.id
                            }
                            value={
                              student.id
                            }
                          >
                            {studentName(
                              student
                            )}{" "}
                            —{" "}
                            {student.admission_number ||
                              "No admission no."}
                          </option>
                        )
                      )}
                  </select>
                </label>

                <label>
                  Issue Date *
                  <input
                    type="date"
                    value={
                      issueForm.issue_date
                    }
                    onChange={(event) =>
                      setIssueForm(
                        (prev) => ({
                          ...prev,
                          issue_date:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Due Date *
                  <input
                    type="date"
                    min={
                      issueForm.issue_date
                    }
                    value={
                      issueForm.due_date
                    }
                    onChange={(event) =>
                      setIssueForm(
                        (prev) => ({
                          ...prev,
                          due_date:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label
                  className={
                    styles.full
                  }
                >
                  Notes
                  <textarea
                    value={
                      issueForm.notes
                    }
                    onChange={(event) =>
                      setIssueForm(
                        (prev) => ({
                          ...prev,
                          notes:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Optional note..."
                    rows={3}
                  />
                </label>
              </div>

              <div
                className={
                  styles.infoBox
                }
              >
                Available copies will
                automatically decrease
                when the book is issued.
              </div>

              <div
                className={
                  styles.modalFooter
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setIssueModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Issuing..."
                    : "Issue Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          EDIT ISSUE / RETURN MODAL
      ================================================= */}

      {editingIssue && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setEditingIssue(null);
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span>LIBRARY</span>
                <h2>Edit Issue / Return</h2>
              </div>

              <button
                onClick={() =>
                  setEditingIssue(null)
                }
              >
                ×
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={saveEditedIssue}
            >
              <div className={styles.formGrid}>
                <label className={styles.full}>
                  Student *
                  <select
                    value={editIssueForm.student_id}
                    onChange={(event) =>
                      setEditIssueForm(
                        (prev) => ({
                          ...prev,
                          student_id:
                            event.target.value,
                        })
                      )
                    }
                  >
                    <option value="">
                      Select student
                    </option>

                    {students.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {studentName(student)}
                        {" — "}
                        {student.admission_number ||
                          "No admission no."}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.full}>
                  Book *
                  <select
                    value={editIssueForm.book_id}
                    onChange={(event) =>
                      setEditIssueForm(
                        (prev) => ({
                          ...prev,
                          book_id:
                            event.target.value,
                        })
                      )
                    }
                  >
                    <option value="">
                      Select book
                    </option>

                    {books.map((book) => {
                      const isCurrent =
                        book.id ===
                        editIssueForm.book_id;

                      const canUse =
                        book.available_copies > 0 ||
                        isCurrent;

                      return (
                        <option
                          key={book.id}
                          value={book.id}
                          disabled={!canUse}
                        >
                          {book.title} —{" "}
                          {book.category ||
                            "No category"}{" "}
                          · Available:{" "}
                          {book.available_copies}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label>
                  Author
                  <input
                    value={
                      bookMap.get(
                        editIssueForm.book_id
                      )?.author || ""
                    }
                    readOnly
                  />
                </label>

                <label>
                  Category
                  <input
                    value={
                      bookMap.get(
                        editIssueForm.book_id
                      )?.category || ""
                    }
                    readOnly
                  />
                </label>

                <label>
                  Issue Date *
                  <input
                    type="date"
                    value={
                      editIssueForm.issue_date
                    }
                    onChange={(event) =>
                      setEditIssueForm(
                        (prev) => ({
                          ...prev,
                          issue_date:
                            event.target.value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Due Date *
                  <input
                    type="date"
                    min={
                      editIssueForm.issue_date
                    }
                    value={
                      editIssueForm.due_date
                    }
                    onChange={(event) =>
                      setEditIssueForm(
                        (prev) => ({
                          ...prev,
                          due_date:
                            event.target.value,
                        })
                      )
                    }
                  />
                </label>

                <label className={styles.full}>
                  <span className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={
                        editIssueForm.submitted
                      }
                      onChange={(event) =>
                        setEditIssueForm(
                          (prev) => ({
                            ...prev,
                            submitted:
                              event.target.checked,
                            return_date:
                              event.target.checked
                                ? prev.return_date ||
                                  today()
                                : "",
                          })
                        )
                      }
                    />
                    Book returned / submitted?
                  </span>
                </label>

                {editIssueForm.submitted && (
                  <label>
                    Return Date *
                    <input
                      type="date"
                      min={
                        editIssueForm.issue_date
                      }
                      value={
                        editIssueForm.return_date
                      }
                      onChange={(event) =>
                        setEditIssueForm(
                          (prev) => ({
                            ...prev,
                            return_date:
                              event.target.value,
                          })
                        )
                      }
                    />
                  </label>
                )}

                <label className={styles.full}>
                  Notes
                  <textarea
                    rows={3}
                    value={
                      editIssueForm.notes
                    }
                    onChange={(event) =>
                      setEditIssueForm(
                        (prev) => ({
                          ...prev,
                          notes:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Optional note..."
                  />
                </label>
              </div>

              <div className={styles.infoBox}>
                {editIssueForm.submitted
                  ? "Book will be marked Returned and the copy will become available. Fine is calculated automatically."
                  : "Book remains with the student. If the due date has passed, it will be marked Overdue automatically."}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() =>
                    setEditingIssue(null)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          RETURN MODAL
      ================================================= */}

      {returnModal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setReturnModal(null);
            }
          }}
        >
          <div className={styles.smallModal}>
            <div className={styles.modalHeader}>
              <div>
                <span>LIBRARY</span>
                <h2>Return Book</h2>
              </div>

              <button
                onClick={() =>
                  setReturnModal(null)
                }
              >
                ×
              </button>
            </div>

            <div className={styles.returnInfo}>
              <div>
                <span>Book</span>
                <strong>
                  {
                    bookMap.get(
                      returnModal.book_id
                    )?.title
                  }
                </strong>
              </div>

              <div>
                <span>Student</span>
                <strong>
                  {studentName(
                    studentMap.get(
                      returnModal.student_id
                    )
                  )}
                </strong>
              </div>

              <div>
                <span>Due Date</span>
                <strong>
                  {returnModal.due_date}
                </strong>
              </div>

              <div>
                <span>Late Days</span>
                <strong>
                  {daysLate(
                    returnModal.due_date,
                    returnDate
                  )}
                </strong>
              </div>

              <div>
                <span>Estimated Fine</span>
                <strong>
                  {money(
                    daysLate(
                      returnModal.due_date,
                      returnDate
                    ) *
                      Number(
                        bookMap.get(
                          returnModal.book_id
                        )?.fine_per_day ||
                          0
                      )
                  )}
                </strong>
              </div>
            </div>

            <div className={styles.returnDate}>
              <label>
                Return Date
                <input
                  type="date"
                  min={
                    returnModal.issue_date
                  }
                  value={returnDate}
                  onChange={(event) =>
                    setReturnDate(
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            <div
              className={
                styles.modalFooter
              }
            >
              <button
                type="button"
                onClick={() =>
                  setReturnModal(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void returnBook()
                }
              >
                {saving
                  ? "Returning..."
                  : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
