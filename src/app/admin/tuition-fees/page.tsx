
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./tuition-fees.module.css";
import { createClient } from "@/lib/supabase/client";

type FeeStatus = "paid" | "pending" | "partial";

type Student = {
  id: string;
  name: string;
  admissionNumber: string;
  batchId: string | null;
  batchName: string;
};

type FeeRecord = {
  id: string;
  student_id: string;
  batch_id: string | null;
  fee_name: string;
  amount: number;
  discount: number;
  paid_amount: number;
  due_date: string | null;
  status: FeeStatus;
  academic_year: string | null;
  created_at: string;
  updated_at: string;
  studentName: string;
  admissionNumber: string;
  batchName: string;
};

type FeeForm = {
  studentId: string;
  batchId: string;
  feeName: string;
  amount: string;
  discount: string;
  paidAmount: string;
  dueDate: string;
  academicYear: string;
};

const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const academicYear = () => {
  const now = new Date();
  const start =
    now.getMonth() >= 3
      ? now.getFullYear()
      : now.getFullYear() - 1;

  return `${start}-${String(start + 1).slice(-2)}`;
};

const blankForm = (): FeeForm => ({
  studentId: "",
  batchId: "",
  feeName: "Tuition Fee",
  amount: "",
  discount: "0",
  paidAmount: "0",
  dueDate: localDate(),
  academicYear: academicYear(),
});

const money = (value: number) =>
  `₹${Math.max(0, Number(value || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const payableOf = (
  fee: Pick<FeeRecord, "amount" | "discount">
) => Math.max(0, Number(fee.amount || 0) - Number(fee.discount || 0));

const pendingOf = (
  fee: Pick<FeeRecord, "amount" | "discount" | "paid_amount">
) => Math.max(0, payableOf(fee) - Number(fee.paid_amount || 0));

const statusOf = (
  amount: number,
  discount: number,
  paid: number
): FeeStatus => {
  const payable = Math.max(0, amount - discount);

  if (payable > 0 && paid >= payable) return "paid";
  if (paid > 0) return "partial";

  return "pending";
};

export default function TuitionFeesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState(false);
  const [form, setForm] = useState<FeeForm>(blankForm());
  const [paymentAmount, setPaymentAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getInstituteId = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Please log in to manage tuition fees.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("institute_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.institute_id) {
      throw new Error(
        profileError?.message || "Your institute profile could not be found."
      );
    }

    return String(profile.institute_id);
  }, [supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const instituteId = await getInstituteId();

      const [studentResult, batchResult, feeResult] = await Promise.all([
        supabase
          .from("students")
          .select(
            "id,first_name,middle_name,last_name,admission_number,batch_id"
          )
          .eq("institute_id", instituteId)
          .order("first_name"),

        supabase
          .from("batches")
          .select("id,name")
          .eq("institute_id", instituteId)
          .order("name"),

        supabase
          .from("tuition_fees")
          .select(
            "id,institute_id,student_id,batch_id,fee_name,amount,discount,paid_amount,due_date,status,academic_year,created_at,updated_at"
          )
          .eq("institute_id", instituteId)
          .order("created_at", { ascending: false }),
      ]);

      if (studentResult.error) {
        throw new Error(`Students: ${studentResult.error.message}`);
      }

      if (batchResult.error) {
        throw new Error(`Batches: ${batchResult.error.message}`);
      }

      if (feeResult.error) {
        throw new Error(`Tuition fees: ${feeResult.error.message}`);
      }

      const batchMap = new Map<string, string>(
        (batchResult.data || []).map((batch: any) => [
          String(batch.id),
          String(batch.name || ""),
        ])
      );

      const studentMap = new Map<string, Student>();

      (studentResult.data || []).forEach((student: any) => {
        const name =
          [
            student.first_name,
            student.middle_name,
            student.last_name,
          ]
            .filter(Boolean)
            .join(" ") || "Unnamed Student";

        studentMap.set(String(student.id), {
          id: String(student.id),
          name,
          admissionNumber: String(student.admission_number || ""),
          batchId: student.batch_id ? String(student.batch_id) : null,
          batchName: student.batch_id
            ? batchMap.get(String(student.batch_id)) || ""
            : "",
        });
      });

      const mapped: FeeRecord[] = (feeResult.data || []).map(
        (row: any) => {
          const amount = Number(row.amount || 0);
          const discount = Number(row.discount || 0);
          const paid = Number(row.paid_amount || 0);
          const student = studentMap.get(String(row.student_id));

          return {
            id: String(row.id),
            student_id: String(row.student_id),
            batch_id: row.batch_id ? String(row.batch_id) : null,
            fee_name: String(row.fee_name || "Tuition Fee"),
            amount,
            discount,
            paid_amount: paid,
            due_date: row.due_date || null,
            status: statusOf(amount, discount, paid),
            academic_year: row.academic_year || null,
            created_at: row.created_at,
            updated_at: row.updated_at,
            studentName: student?.name || "Unknown Student",
            admissionNumber: student?.admissionNumber || "",
            batchName: row.batch_id
              ? batchMap.get(String(row.batch_id)) || ""
              : student?.batchName || "",
          };
        }
      );

      setStudents(Array.from(studentMap.values()));
      setFees(mapped);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load fee records."
      );
    } finally {
      setLoading(false);
    }
  }, [getInstituteId, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totals = useMemo(
    () =>
      fees.reduce(
        (acc, fee) => {
          acc.total += payableOf(fee);
          acc.collected += Math.min(
            payableOf(fee),
            Math.max(0, Number(fee.paid_amount || 0))
          );
          acc.pending += pendingOf(fee);
          return acc;
        },
        { total: 0, collected: 0, pending: 0 }
      ),
    [fees]
  );

  const filteredFees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return fees.filter((fee) => {
      const tabMatch =
        activeFilter === "All" ||
        fee.status === activeFilter.toLowerCase();

      const selectMatch =
        statusFilter === "All Status" ||
        fee.status === statusFilter.toLowerCase();

      const searchMatch =
        !query ||
        [
          fee.studentName,
          fee.admissionNumber,
          fee.fee_name,
          fee.batchName,
        ].some((value) => value.toLowerCase().includes(query));

      return tabMatch && selectMatch && searchMatch;
    });
  }, [fees, search, statusFilter, activeFilter]);

  const openAdd = () => {
    setEditingId(null);
    setPaymentMode(false);

    const next = blankForm();

    if (students[0]) {
      next.studentId = students[0].id;
      next.batchId = students[0].batchId || "";
    }

    setForm(next);
    setPaymentAmount("");
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEdit = (fee: FeeRecord) => {
    setEditingId(fee.id);
    setPaymentMode(false);
    setError("");
    setSuccess("");

    setForm({
      studentId: fee.student_id,
      batchId: fee.batch_id || "",
      feeName: fee.fee_name,
      amount: String(fee.amount),
      discount: String(fee.discount),
      paidAmount: String(fee.paid_amount),
      dueDate: fee.due_date || "",
      academicYear: fee.academic_year || academicYear(),
    });

    setShowForm(true);
  };

  const openPayment = (fee: FeeRecord) => {
    setEditingId(fee.id);
    setPaymentMode(true);
    setError("");
    setSuccess("");
    setPaymentAmount("");

    setForm({
      studentId: fee.student_id,
      batchId: fee.batch_id || "",
      feeName: fee.fee_name,
      amount: String(fee.amount),
      discount: String(fee.discount),
      paidAmount: String(fee.paid_amount),
      dueDate: fee.due_date || "",
      academicYear: fee.academic_year || academicYear(),
    });

    setShowForm(true);
  };

  const changeStudent = (studentId: string) => {
    const student = students.find((item) => item.id === studentId);

    setForm((old) => ({
      ...old,
      studentId,
      batchId: student?.batchId || "",
    }));
  };

  const saveFee = async () => {
    setError("");
    setSuccess("");

    if (!form.studentId) {
      setError("Please select a student.");
      return;
    }

    const amount = Number(form.amount);
    const discount = Number(form.discount || 0);
    const paid = Number(form.paidAmount || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Total fee must be greater than zero.");
      return;
    }

    if (
      !Number.isFinite(discount) ||
      discount < 0 ||
      discount > amount
    ) {
      setError("Discount must be between zero and total fee.");
      return;
    }

    if (
      !Number.isFinite(paid) ||
      paid < 0 ||
      paid > amount - discount
    ) {
      setError("Paid amount cannot exceed the payable amount.");
      return;
    }

    setSaving(true);

    try {
      const instituteId = await getInstituteId();

      const payload = {
        institute_id: instituteId,
        student_id: form.studentId,
        batch_id: form.batchId || null,
        fee_name: form.feeName.trim() || "Tuition Fee",
        amount,
        discount,
        paid_amount: paid,
        due_date: form.dueDate || null,
        status: statusOf(amount, discount, paid),
        academic_year: form.academicYear.trim() || academicYear(),
      };

      const result = editingId
        ? await supabase
            .from("tuition_fees")
            .update(payload)
            .eq("id", editingId)
            .eq("institute_id", instituteId)
        : await supabase.from("tuition_fees").insert(payload);

      if (result.error) {
        throw new Error(result.error.message);
      }

      setShowForm(false);
      setEditingId(null);
      setSuccess(
        editingId
          ? "Fee record updated successfully."
          : "Fee record created successfully."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save fee record."
      );
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async () => {
    setError("");
    setSuccess("");

    if (!editingId) {
      setError("Select a fee record first.");
      return;
    }

    const received = Number(paymentAmount);

    if (!Number.isFinite(received) || received <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }

    const fee = fees.find((item) => item.id === editingId);

    if (!fee) {
      setError("Fee record not found. Refresh and try again.");
      return;
    }

    const outstanding = pendingOf(fee);

    if (received > outstanding) {
      setError(`Payment cannot exceed the remaining balance of ${money(outstanding)}.`);
      return;
    }

    setSaving(true);

    try {
      const instituteId = await getInstituteId();
      const newPaid = Number(fee.paid_amount || 0) + received;

      const { error: updateError } = await supabase
        .from("tuition_fees")
        .update({
          paid_amount: newPaid,
          status: statusOf(fee.amount, fee.discount, newPaid),
        })
        .eq("id", fee.id)
        .eq("institute_id", instituteId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setShowForm(false);
      setSuccess(
        `Payment of ${money(received)} recorded on the fee record.`
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to record payment."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteFee = async (fee: FeeRecord) => {
    const confirmed = window.confirm(
      `Delete "${fee.fee_name}" for ${fee.studentName}? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const instituteId = await getInstituteId();

      const { error: deleteError } = await supabase
        .from("tuition_fees")
        .delete()
        .eq("id", fee.id)
        .eq("institute_id", instituteId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setSuccess("Fee record deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete fee record."
      );
    }
  };

  const exportCsv = () => {
    if (!filteredFees.length) {
      setError("No fee records available to export.");
      return;
    }

    const headers = [
      "Student",
      "Admission No",
      "Batch",
      "Fee",
      "Amount",
      "Discount",
      "Payable",
      "Paid",
      "Pending",
      "Due Date",
      "Status",
      "Academic Year",
    ];

    const rows = filteredFees.map((fee) => [
      fee.studentName,
      fee.admissionNumber,
      fee.batchName,
      fee.fee_name,
      fee.amount,
      fee.discount,
      payableOf(fee),
      fee.paid_amount,
      pendingOf(fee),
      fee.due_date || "",
      fee.status,
      fee.academic_year || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "tuition-fees.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const setField = (key: keyof FeeForm, value: string) => {
    setForm((old) => ({ ...old, [key]: value }));
  };

  const payablePreview = Math.max(
    0,
    Number(form.amount || 0) - Number(form.discount || 0)
  );

  const selectedPaymentFee = fees.find((fee) => fee.id === editingId);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.eyebrow}>FINANCE MANAGEMENT</div>
          <h1>
            Tuition <span>Fees</span>
          </h1>
          <p>
            Manage student fees, payments and pending balances from one
            organized workspace.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.exportButton}
            onClick={exportCsv}
          >
            <b aria-hidden="true">↓</b>
            <span>Export</span>
          </button>

          <button
            type="button"
            className={styles.addButton}
            onClick={openAdd}
          >
            <b aria-hidden="true">＋</b>
            <span>Add Fee</span>
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.alertError} role="alert">
          <strong>Something needs attention</strong>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className={styles.alertSuccess} role="status">
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <section className={styles.statsGrid} aria-label="Fee totals">
        <article className={`${styles.statCard} ${styles.purpleCard}`}>
          <div className={styles.statIcon}>₹</div>
          <div className={styles.statCopy}>
            <p>Total Fees</p>
            <strong>{loading ? "—" : money(totals.total)}</strong>
            <small>Fee amount after discounts</small>
          </div>
        </article>

        <article className={`${styles.statCard} ${styles.greenCard}`}>
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statCopy}>
            <p>Total Collected</p>
            <strong>{loading ? "—" : money(totals.collected)}</strong>
            <small>Payments applied to fee records</small>
          </div>
        </article>

        <article className={`${styles.statCard} ${styles.orangeCard}`}>
          <div className={styles.statIcon}>!</div>
          <div className={styles.statCopy}>
            <p>Pending Fees</p>
            <strong>{loading ? "—" : money(totals.pending)}</strong>
            <small>Outstanding balance</small>
          </div>
        </article>

        <article className={`${styles.statCard} ${styles.blueCard}`}>
          <div className={styles.statIcon}>#</div>
          <div className={styles.statCopy}>
            <p>Fee Records</p>
            <strong>{loading ? "—" : fees.length}</strong>
            <small>Database records</small>
          </div>
        </article>
      </section>

      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <div className={styles.eyebrow}>FEE DIRECTORY</div>
            <h2>All Fee Records</h2>
            <p>View, update and manage student tuition fee information.</p>
          </div>

          <button
            type="button"
            className={styles.recordButton}
            onClick={() => (fees.length ? openPayment(fees[0]) : openAdd())}
          >
            {fees.length ? "＋ Record Payment" : "＋ Add First Fee"}
          </button>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.tabs}>
            {["All", "Paid", "Pending", "Partial"].map((filter) => (
              <button
                type="button"
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={
                  activeFilter === filter
                    ? styles.activeFilter
                    : styles.filterButton
                }
              >
                {filter}
                <span>
                  {filter === "All"
                    ? fees.length
                    : fees.filter(
                        (fee) => fee.status === filter.toLowerCase()
                      ).length}
                </span>
              </button>
            ))}
          </div>

          <select
            className={styles.select}
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option>All Status</option>
            <option>Paid</option>
            <option>Pending</option>
            <option>Partial</option>
          </select>

          <input
            className={styles.search}
            aria-label="Search fees"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, admission no, batch..."
          />

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void loadData()}
            disabled={loading}
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyMark}>…</div>
            <h3>Loading fee records</h3>
            <p>Fetching current institute records from Supabase.</p>
          </div>
        ) : filteredFees.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyMark}>₹</div>
            <h3>No fee records found</h3>
            <p>
              {fees.length
                ? "Try changing the search or filters."
                : "Add a fee record to start managing tuition fees."}
            </p>
            {!fees.length && (
              <button
                type="button"
                className={styles.addButton}
                onClick={openAdd}
              >
                ＋ Add First Fee
              </button>
            )}
          </div>
        ) : (
          <div className={styles.feeList}>
            {filteredFees.map((fee) => (
              <article className={styles.feeCard} key={fee.id}>
                <div className={styles.feeCardTop}>
                  <div>
                    <span className={styles.feeLabel}>{fee.fee_name}</span>
                    <h3>{fee.studentName}</h3>
                    <p>
                      {fee.admissionNumber
                        ? `Admission ${fee.admissionNumber} · `
                        : ""}
                      {fee.batchName || "No batch assigned"}
                    </p>
                  </div>

                  <span className={`${styles.status} ${styles[fee.status]}`}>
                    {fee.status}
                  </span>
                </div>

                <div className={styles.feeMetrics}>
                  <div>
                    <small>Payable</small>
                    <strong>{money(payableOf(fee))}</strong>
                  </div>
                  <div>
                    <small>Discount</small>
                    <strong>{money(fee.discount)}</strong>
                  </div>
                  <div>
                    <small>Paid</small>
                    <strong className={styles.paidValue}>
                      {money(fee.paid_amount)}
                    </strong>
                  </div>
                  <div>
                    <small>Pending</small>
                    <strong
                      className={
                        pendingOf(fee) > 0
                          ? styles.pendingValue
                          : styles.paidValue
                      }
                    >
                      {money(pendingOf(fee))}
                    </strong>
                  </div>
                  <div>
                    <small>Due date</small>
                    <strong>
                      {fee.due_date
                        ? new Date(
                            `${fee.due_date}T00:00:00`
                          ).toLocaleDateString("en-IN")
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className={styles.feeCardActions}>
                  <button
                    type="button"
                    className={styles.paymentButton}
                    disabled={pendingOf(fee) <= 0}
                    onClick={() => openPayment(fee)}
                  >
                    Record Payment <b>→</b>
                  </button>

                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => openEdit(fee)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => void deleteFee(fee)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && (
          <div className={styles.directoryFooter}>
            Showing <strong>{filteredFees.length}</strong> of{" "}
            <strong>{fees.length}</strong> fee records
          </div>
        )}
      </section>

      {showForm && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fee-modal-title"
          >
            <header className={styles.modalHeader}>
              <div>
                <div className={styles.eyebrow}>
                  {paymentMode ? "PAYMENT ENTRY" : "FEE MANAGEMENT"}
                </div>
                <h2 id="fee-modal-title">
                  {paymentMode
                    ? "Record a Payment"
                    : editingId
                      ? "Edit Fee Record"
                      : "Add Fee Record"}
                </h2>
                <p>
                  {paymentMode
                    ? "Add the amount received to the selected fee record."
                    : "Enter the fee details for this student."}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => !saving && setShowForm(false)}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </header>

            {paymentMode ? (
              <div className={styles.paymentSummary}>
                <div>
                  <span>Student</span>
                  <strong>{selectedPaymentFee?.studentName || "—"}</strong>
                </div>

                <div>
                  <span>Remaining balance</span>
                  <strong>
                    {selectedPaymentFee
                      ? money(pendingOf(selectedPaymentFee))
                      : money(0)}
                  </strong>
                </div>

                <label className={styles.inputGroup}>
                  <span>Payment amount (₹)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) =>
                      setPaymentAmount(event.target.value)
                    }
                    placeholder="Enter received amount"
                  />
                </label>

                <p className={styles.helperText}>
                  This updates <code>tuition_fees.paid_amount</code>. It does
                  not create a separate row in <code>fee_payments</code>.
                </p>
              </div>
            ) : (
              <div className={styles.formGrid}>
                <label className={styles.inputGroup}>
                  <span>Student *</span>
                  <select
                    value={form.studentId}
                    onChange={(event) => changeStudent(event.target.value)}
                  >
                    <option value="">
                      {students.length
                        ? "Select student"
                        : "No students available"}
                    </option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                        {student.admissionNumber
                          ? ` — ${student.admissionNumber}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.inputGroup}>
                  <span>Fee name</span>
                  <input
                    value={form.feeName}
                    onChange={(event) =>
                      setField("feeName", event.target.value)
                    }
                    placeholder="Tuition Fee"
                  />
                </label>

                <label className={styles.inputGroup}>
                  <span>Total fee (₹) *</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setField("amount", event.target.value)
                    }
                    placeholder="1000"
                  />
                </label>

                <label className={styles.inputGroup}>
                  <span>Discount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount}
                    onChange={(event) =>
                      setField("discount", event.target.value)
                    }
                  />
                </label>

                <label className={styles.inputGroup}>
                  <span>Paid amount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.paidAmount}
                    onChange={(event) =>
                      setField("paidAmount", event.target.value)
                    }
                  />
                </label>

                <label className={styles.inputGroup}>
                  <span>Due date</span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setField("dueDate", event.target.value)
                    }
                  />
                </label>

                <label className={styles.inputGroup}>
                  <span>Academic year</span>
                  <input
                    value={form.academicYear}
                    onChange={(event) =>
                      setField("academicYear", event.target.value)
                    }
                    placeholder="2026-27"
                  />
                </label>

                <div className={styles.preview}>
                  <div>
                    <span>Net payable</span>
                    <strong>{money(payablePreview)}</strong>
                  </div>
                  <div>
                    <span>Pending after entered payment</span>
                    <strong>
                      {money(
                        Math.max(
                          0,
                          payablePreview - Number(form.paidAmount || 0)
                        )
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.addButton}
                onClick={() =>
                  void (paymentMode ? savePayment() : saveFee())
                }
                disabled={saving || (!paymentMode && !students.length)}
              >
                {saving
                  ? "Saving…"
                  : paymentMode
                    ? "Save Payment"
                    : editingId
                      ? "Update Fee"
                      : "Save Fee"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
