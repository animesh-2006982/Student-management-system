
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./inventory.module.css";

type Item = {
  id: string;
  institute_id: string;
  item_id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  unit: string;
  quantity: number;
  minimum_stock: number;
  purchase_price: number;
  supplier?: string | null;
  location?: string | null;
  status: "Active" | "Inactive";
  created_at?: string;
};

type Transaction = {
  id: string;
  item_id: string;
  transaction_type:
    | "Stock In"
    | "Stock Out"
    | "Adjustment"
    | "Opening";
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  unit_price?: number | null;
  supplier?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at: string;
};

const supabase = createClient();

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function number(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] =
    useState<"inventory" | "history">("inventory");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");
  const [stockFilter, setStockFilter] =
    useState("all");

  const [itemModal, setItemModal] =
    useState(false);
  const [stockModal, setStockModal] =
    useState<{
      item: Item;
      mode: "in" | "out" | "adjust";
    } | null>(null);
  const [historyModal, setHistoryModal] =
    useState<Item | null>(null);

  const [editingItem, setEditingItem] =
    useState<Item | null>(null);

  const [itemForm, setItemForm] = useState({
    item_id: "",
    name: "",
    category: "",
    description: "",
    unit: "pcs",
    quantity: "0",
    minimum_stock: "0",
    purchase_price: "0",
    supplier: "",
    location: "",
    status: "Active",
  });

  const [stockForm, setStockForm] = useState({
    quantity: "",
    new_quantity: "",
    unit_price: "",
    supplier: "",
    reference: "",
    notes: "",
  });

  const getInstituteId = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) {
      throw new Error("Please login first.");
    }

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

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const instituteId =
          await getInstituteId();

        const [
          itemsResult,
          transactionsResult,
        ] = await Promise.all([
          supabase
            .from("inventory_items")
            .select("*")
            .eq("institute_id", instituteId)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("inventory_transactions")
            .select("*")
            .eq("institute_id", instituteId)
            .order("created_at", {
              ascending: false,
            })
            .limit(500),
        ]);

        if (itemsResult.error)
          throw itemsResult.error;

        if (transactionsResult.error)
          throw transactionsResult.error;

        setItems(
          (itemsResult.data || []) as Item[]
        );

        setTransactions(
          (transactionsResult.data ||
            []) as Transaction[]
        );
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ||
            "Unable to load inventory."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getInstituteId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const itemMap = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) =>
      map.set(item.id, item)
    );
    return map;
  }, [items]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.category)
            .filter(Boolean)
        )
      ).sort() as string[],
    [items]
  );

  const totalItems = items.length;

  const totalQuantity = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const lowStock = items.filter(
    (item) =>
      Number(item.quantity) <=
      Number(item.minimum_stock)
  );

  const outOfStock = items.filter(
    (item) => Number(item.quantity) === 0
  );

  const inventoryValue = items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0) *
        Number(item.purchase_price || 0),
    0
  );

  const filteredItems = items.filter((item) => {
    const q = search.trim().toLowerCase();

    const matchesSearch =
      !q ||
      item.item_id
        .toLowerCase()
        .includes(q) ||
      item.name
        .toLowerCase()
        .includes(q) ||
      String(item.category || "")
        .toLowerCase()
        .includes(q) ||
      String(item.supplier || "")
        .toLowerCase()
        .includes(q);

    const matchesCategory =
      categoryFilter === "all" ||
      item.category === categoryFilter;

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low" &&
        Number(item.quantity) <=
          Number(item.minimum_stock)) ||
      (stockFilter === "out" &&
        Number(item.quantity) === 0) ||
      (stockFilter === "available" &&
        Number(item.quantity) >
          Number(item.minimum_stock));

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStock
    );
  });

  const filteredTransactions =
    transactions.filter((transaction) => {
      const item = itemMap.get(
        transaction.item_id
      );

      const q = search.trim().toLowerCase();

      return (
        !q ||
        item?.name
          .toLowerCase()
          .includes(q) ||
        item?.item_id
          .toLowerCase()
          .includes(q) ||
        transaction.transaction_type
          .toLowerCase()
          .includes(q) ||
        String(transaction.reference || "")
          .toLowerCase()
          .includes(q)
      );
    });

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function openAddItem() {
    clearMessages();

    setEditingItem(null);

    setItemForm({
      item_id: "",
      name: "",
      category: "",
      description: "",
      unit: "pcs",
      quantity: "0",
      minimum_stock: "0",
      purchase_price: "0",
      supplier: "",
      location: "",
      status: "Active",
    });

    setItemModal(true);
  }

  function openEditItem(item: Item) {
    clearMessages();

    setEditingItem(item);

    setItemForm({
      item_id: item.item_id,
      name: item.name,
      category: item.category || "",
      description: item.description || "",
      unit: item.unit,
      quantity: String(item.quantity),
      minimum_stock: String(
        item.minimum_stock
      ),
      purchase_price: String(
        item.purchase_price
      ),
      supplier: item.supplier || "",
      location: item.location || "",
      status: item.status,
    });

    setItemModal(true);
  }

  async function saveItem(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    clearMessages();

    try {
      const instituteId =
        await getInstituteId();

      if (
        !itemForm.item_id.trim() ||
        !itemForm.name.trim()
      ) {
        throw new Error(
          "Item ID and item name are required."
        );
      }

      const quantity =
        Math.max(
          Number(itemForm.quantity) || 0,
          0
        );

      const minimumStock =
        Math.max(
          Number(
            itemForm.minimum_stock
          ) || 0,
          0
        );

      const purchasePrice =
        Math.max(
          Number(
            itemForm.purchase_price
          ) || 0,
          0
        );

      if (editingItem) {
        const { error } =
          await supabase
            .from("inventory_items")
            .update({
              item_id:
                itemForm.item_id.trim(),
              name:
                itemForm.name.trim(),
              category:
                itemForm.category.trim() ||
                null,
              description:
                itemForm.description.trim() ||
                null,
              unit:
                itemForm.unit.trim() ||
                "pcs",
              quantity,
              minimum_stock:
                minimumStock,
              purchase_price:
                purchasePrice,
              supplier:
                itemForm.supplier.trim() ||
                null,
              location:
                itemForm.location.trim() ||
                null,
              status:
                itemForm.status ===
                "Inactive"
                  ? "Inactive"
                  : "Active",
            })
            .eq(
              "id",
              editingItem.id
            )
            .eq(
              "institute_id",
              instituteId
            );

        if (error) throw error;
      } else {
        const { data: userData } =
          await supabase.auth.getUser();

        const { data, error } =
          await supabase
            .from("inventory_items")
            .insert({
              institute_id:
                instituteId,
              item_id:
                itemForm.item_id.trim(),
              name:
                itemForm.name.trim(),
              category:
                itemForm.category.trim() ||
                null,
              description:
                itemForm.description.trim() ||
                null,
              unit:
                itemForm.unit.trim() ||
                "pcs",
              quantity,
              minimum_stock:
                minimumStock,
              purchase_price:
                purchasePrice,
              supplier:
                itemForm.supplier.trim() ||
                null,
              location:
                itemForm.location.trim() ||
                null,
              status: "Active",
              created_by:
                userData.user?.id || null,
            })
            .select()
            .single();

        if (error) throw error;

        if (quantity > 0 && data) {
          await supabase
            .from(
              "inventory_transactions"
            )
            .insert({
              institute_id:
                instituteId,
              item_id: data.id,
              transaction_type:
                "Opening",
              quantity,
              previous_quantity: 0,
              new_quantity: quantity,
              unit_price:
                purchasePrice,
              supplier:
                itemForm.supplier.trim() ||
                null,
              notes:
                "Opening stock",
              created_by:
                userData.user?.id ||
                null,
            });
        }
      }

      setItemModal(false);
      setSuccess(
        editingItem
          ? "Inventory item updated successfully."
          : "Inventory item added successfully."
      );

      await loadData(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to save inventory item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: Item) {
    clearMessages();

    if (
      !window.confirm(
        `Delete "${item.name}"?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("inventory_items")
        .delete()
        .eq("id", item.id);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(
      "Inventory item deleted successfully."
    );

    await loadData(true);
  }

  function openStock(
    item: Item,
    mode: "in" | "out" | "adjust"
  ) {
    clearMessages();

    setStockForm({
      quantity: "",
      new_quantity: String(
        item.quantity
      ),
      unit_price: String(
        item.purchase_price || ""
      ),
      supplier: item.supplier || "",
      reference: "",
      notes: "",
    });

    setStockModal({
      item,
      mode,
    });
  }

  async function saveStock(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!stockModal) return;

    setSaving(true);
    clearMessages();

    try {
      let error: any = null;

      if (stockModal.mode === "in") {
        const quantity =
          Number(stockForm.quantity);

        if (
          !quantity ||
          quantity <= 0
        ) {
          throw new Error(
            "Enter a valid stock-in quantity."
          );
        }

        const result =
          await supabase.rpc(
            "inventory_stock_in",
            {
              p_item_id:
                stockModal.item.id,
              p_quantity: quantity,
              p_unit_price:
                stockForm.unit_price
                  ? Number(
                      stockForm.unit_price
                    )
                  : null,
              p_supplier:
                stockForm.supplier.trim() ||
                null,
              p_reference:
                stockForm.reference.trim() ||
                null,
              p_notes:
                stockForm.notes.trim() ||
                null,
            }
          );

        error = result.error;
      }

      if (stockModal.mode === "out") {
        const quantity =
          Number(stockForm.quantity);

        if (
          !quantity ||
          quantity <= 0
        ) {
          throw new Error(
            "Enter a valid stock-out quantity."
          );
        }

        const result =
          await supabase.rpc(
            "inventory_stock_out",
            {
              p_item_id:
                stockModal.item.id,
              p_quantity: quantity,
              p_reference:
                stockForm.reference.trim() ||
                null,
              p_notes:
                stockForm.notes.trim() ||
                null,
            }
          );

        error = result.error;
      }

      if (stockModal.mode === "adjust") {
        const newQuantity =
          Number(
            stockForm.new_quantity
          );

        if (
          Number.isNaN(newQuantity) ||
          newQuantity < 0
        ) {
          throw new Error(
            "Enter a valid final stock quantity."
          );
        }

        const result =
          await supabase.rpc(
            "inventory_adjust_stock",
            {
              p_item_id:
                stockModal.item.id,
              p_new_quantity:
                newQuantity,
              p_notes:
                stockForm.notes.trim() ||
                null,
            }
          );

        error = result.error;
      }

      if (error) throw error;

      setStockModal(null);

      setSuccess(
        stockModal.mode === "in"
          ? "Stock added successfully."
          : stockModal.mode === "out"
            ? "Stock issued successfully."
            : "Stock adjusted successfully."
      );

      await loadData(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to update stock."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedHistory =
    historyModal
      ? filteredTransactions.filter(
          (transaction) =>
            transaction.item_id ===
            historyModal.id
        )
      : [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            TOOLS
          </span>

          <h1>Inventory</h1>

          <p>
            Manage stock, supplies,
            purchases and inventory
            movements.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            onClick={() =>
              void loadData(true)
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

          <button
            className={styles.primaryButton}
            onClick={openAddItem}
          >
            + Add Item
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>

          <button
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className={styles.success}>
          <span>{success}</span>

          <button
            onClick={() => setSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total Items</span>
          <strong>{totalItems}</strong>
          <small>Inventory products</small>
        </div>

        <div className={styles.statCard}>
          <span>Total Quantity</span>
          <strong>
            {number(totalQuantity)}
          </strong>
          <small>Across all items</small>
        </div>

        <div className={styles.statCard}>
          <span>Low Stock</span>
          <strong>{lowStock.length}</strong>
          <small>At or below minimum</small>
        </div>

        <div className={styles.statCard}>
          <span>Out of Stock</span>
          <strong>{outOfStock.length}</strong>
          <small>Zero quantity</small>
        </div>

        <div className={styles.statCard}>
          <span>Categories</span>
          <strong>{categories.length}</strong>
          <small>Item categories</small>
        </div>

        <div className={styles.statCard}>
          <span>Stock Value</span>
          <strong>
            {money(inventoryValue)}
          </strong>
          <small>Purchase value</small>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <button
            className={
              activeTab === "inventory"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              setActiveTab("inventory")
            }
          >
            📦 Inventory
          </button>

          <button
            className={
              activeTab === "history"
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              setActiveTab("history")
            }
          >
            ↕ Stock History
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
              activeTab === "inventory"
                ? "Search item, ID, category, supplier..."
                : "Search item or transaction..."
            }
          />

          {activeTab === "inventory" && (
            <>
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

              <select
                value={stockFilter}
                onChange={(event) =>
                  setStockFilter(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All Stock
                </option>

                <option value="low">
                  Low Stock
                </option>

                <option value="out">
                  Out of Stock
                </option>

                <option value="available">
                  Available
                </option>
              </select>
            </>
          )}
        </div>
      </div>

      {activeTab === "inventory" && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Inventory Catalogue</h2>
              <span>
                {filteredItems.length} item
                {filteredItems.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <button
              className={styles.smallPrimary}
              onClick={openAddItem}
            >
              + Add Item
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Minimum</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Supplier</th>
                  <th>Stock Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map(
                  (item, index) => {
                    const isOut =
                      Number(
                        item.quantity
                      ) === 0;

                    const isLow =
                      Number(
                        item.quantity
                      ) <=
                      Number(
                        item.minimum_stock
                      );

                    return (
                      <tr key={item.id}>
                        <td>
                          {index + 1}
                        </td>

                        <td>
                          <strong>
                            {item.name}
                          </strong>

                          <small>
                            ID: {item.item_id}
                          </small>
                        </td>

                        <td>
                          {item.category ||
                            "—"}
                        </td>

                        <td>
                          <strong>
                            {number(
                              item.quantity
                            )}
                          </strong>
                        </td>

                        <td>
                          {number(
                            item.minimum_stock
                          )}
                        </td>

                        <td>
                          {item.unit}
                        </td>

                        <td>
                          {money(
                            item.purchase_price
                          )}
                        </td>

                        <td>
                          {item.supplier ||
                            "—"}
                        </td>

                        <td>
                          <span
                            className={
                              isOut
                                ? styles.outBadge
                                : isLow
                                  ? styles.lowBadge
                                  : styles.goodBadge
                            }
                          >
                            {isOut
                              ? "Out of Stock"
                              : isLow
                                ? "Low Stock"
                                : "In Stock"}
                          </span>
                        </td>

                        <td>
                          <div
                            className={
                              styles.rowActions
                            }
                          >
                            <button
                              className={
                                styles.inButton
                              }
                              onClick={() =>
                                openStock(
                                  item,
                                  "in"
                                )
                              }
                            >
                              + In
                            </button>

                            <button
                              className={
                                styles.outButton
                              }
                              disabled={
                                Number(
                                  item.quantity
                                ) <= 0
                              }
                              onClick={() =>
                                openStock(
                                  item,
                                  "out"
                                )
                              }
                            >
                              − Out
                            </button>

                            <button
                              onClick={() =>
                                openStock(
                                  item,
                                  "adjust"
                                )
                              }
                            >
                              Adjust
                            </button>

                            <button
                              onClick={() =>
                                setHistoryModal(
                                  item
                                )
                              }
                            >
                              History
                            </button>

                            <button
                              onClick={() =>
                                openEditItem(
                                  item
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className={
                                styles.deleteButton
                              }
                              onClick={() =>
                                void deleteItem(
                                  item
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}

                {!filteredItems.length && (
                  <tr>
                    <td
                      colSpan={10}
                      className={styles.empty}
                    >
                      {loading
                        ? "Loading inventory..."
                        : "No inventory items found. Add your first item."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "history" && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Stock History</h2>
              <span>
                Every stock movement is
                recorded here.
              </span>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Previous</th>
                  <th>New Stock</th>
                  <th>Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map(
                  (transaction, index) => {
                    const item =
                      itemMap.get(
                        transaction.item_id
                      );

                    return (
                      <tr
                        key={
                          transaction.id
                        }
                      >
                        <td>
                          {index + 1}
                        </td>

                        <td>
                          {new Date(
                            transaction.created_at
                          ).toLocaleString(
                            "en-IN",
                            {
                              dateStyle:
                                "medium",
                              timeStyle:
                                "short",
                            }
                          )}
                        </td>

                        <td>
                          <strong>
                            {item?.name ||
                              "Deleted Item"}
                          </strong>

                          <small>
                            {item?.item_id ||
                              "—"}
                          </small>
                        </td>

                        <td>
                          <span
                            className={
                              transaction.transaction_type ===
                              "Stock In"
                                ? styles.historyIn
                                : transaction.transaction_type ===
                                    "Stock Out"
                                  ? styles.historyOut
                                  : styles.historyAdjust
                            }
                          >
                            {
                              transaction.transaction_type
                            }
                          </span>
                        </td>

                        <td>
                          {number(
                            transaction.quantity
                          )}
                        </td>

                        <td>
                          {number(
                            transaction.previous_quantity
                          )}
                        </td>

                        <td>
                          {number(
                            transaction.new_quantity
                          )}
                        </td>

                        <td>
                          {transaction.reference ||
                            "—"}
                        </td>

                        <td>
                          {transaction.notes ||
                            "—"}
                        </td>
                      </tr>
                    );
                  }
                )}

                {!filteredTransactions.length && (
                  <tr>
                    <td
                      colSpan={9}
                      className={styles.empty}
                    >
                      No stock history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ITEM MODAL */}

      {itemModal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setItemModal(false);
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span>INVENTORY</span>
                <h2>
                  {editingItem
                    ? "Edit Inventory Item"
                    : "Add Inventory Item"}
                </h2>
              </div>

              <button
                onClick={() =>
                  setItemModal(false)
                }
              >
                ×
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={saveItem}
            >
              <div className={styles.formGrid}>
                <label>
                  Item ID *
                  <input
                    value={
                      itemForm.item_id
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          item_id:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="INV-001"
                  />
                </label>

                <label>
                  Item Name *
                  <input
                    value={
                      itemForm.name
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          name:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Whiteboard Marker"
                  />
                </label>

                <label>
                  Category
                  <input
                    value={
                      itemForm.category
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          category:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Stationery"
                  />
                </label>

                <label>
                  Unit
                  <input
                    value={
                      itemForm.unit
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          unit:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="pcs"
                  />
                </label>

                <label>
                  Quantity
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      itemForm.quantity
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          quantity:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Minimum Stock
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      itemForm.minimum_stock
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          minimum_stock:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Purchase Price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      itemForm.purchase_price
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          purchase_price:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Supplier
                  <input
                    value={
                      itemForm.supplier
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          supplier:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Supplier name"
                  />
                </label>

                <label>
                  Location
                  <input
                    value={
                      itemForm.location
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          location:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Store room / Lab"
                  />
                </label>

                <label>
                  Status
                  <select
                    value={
                      itemForm.status
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          status:
                            event.target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="Active">
                      Active
                    </option>
                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </label>

                <label
                  className={
                    styles.full
                  }
                >
                  Description
                  <textarea
                    rows={3}
                    value={
                      itemForm.description
                    }
                    onChange={(event) =>
                      setItemForm(
                        (prev) => ({
                          ...prev,
                          description:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Optional description..."
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
                    setItemModal(false)
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
                    : editingItem
                      ? "Update Item"
                      : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK MODAL */}

      {stockModal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setStockModal(null);
            }
          }}
        >
          <div className={styles.smallModal}>
            <div className={styles.modalHeader}>
              <div>
                <span>INVENTORY</span>
                <h2>
                  {stockModal.mode === "in"
                    ? "Stock In"
                    : stockModal.mode ===
                        "out"
                      ? "Stock Out"
                      : "Adjust Stock"}
                </h2>
              </div>

              <button
                onClick={() =>
                  setStockModal(null)
                }
              >
                ×
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={saveStock}
            >
              <div
                className={
                  styles.selectedItem
                }
              >
                <span>Selected Item</span>
                <strong>
                  {stockModal.item.name}
                </strong>
                <small>
                  {stockModal.item.item_id} ·
                  Current stock:{" "}
                  {number(
                    stockModal.item.quantity
                  )}{" "}
                  {stockModal.item.unit}
                </small>
              </div>

              {stockModal.mode ===
                "adjust" ? (
                <label>
                  New Stock Quantity
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      stockForm.new_quantity
                    }
                    onChange={(event) =>
                      setStockForm(
                        (prev) => ({
                          ...prev,
                          new_quantity:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>
              ) : (
                <>
                  <label>
                    Quantity
                    <input
                      autoFocus
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        stockForm.quantity
                      }
                      onChange={(event) =>
                        setStockForm(
                          (prev) => ({
                            ...prev,
                            quantity:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Enter quantity"
                    />
                  </label>

                  {stockModal.mode ===
                    "in" && (
                    <>
                      <label>
                        Purchase Price / Unit
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            stockForm.unit_price
                          }
                          onChange={(event) =>
                            setStockForm(
                              (prev) => ({
                                ...prev,
                                unit_price:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                        />
                      </label>

                      <label>
                        Supplier
                        <input
                          value={
                            stockForm.supplier
                          }
                          onChange={(
                            event
                          ) =>
                            setStockForm(
                              (prev) => ({
                                ...prev,
                                supplier:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                        />
                      </label>
                    </>
                  )}
                </>
              )}

              {stockModal.mode !==
                "adjust" && (
                <label>
                  Reference
                  <input
                    value={
                      stockForm.reference
                    }
                    onChange={(event) =>
                      setStockForm(
                        (prev) => ({
                          ...prev,
                          reference:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Invoice / issue reference"
                  />
                </label>
              )}

              <label>
                Notes
                <textarea
                  rows={3}
                  value={
                    stockForm.notes
                  }
                  onChange={(event) =>
                    setStockForm(
                      (prev) => ({
                        ...prev,
                        notes:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Optional note..."
                />
              </label>

              <div
                className={
                  styles.stockPreview
                }
              >
                <span>
                  Current
                  <strong>
                    {number(
                      stockModal.item
                        .quantity
                    )}
                  </strong>
                </span>

                <b>→</b>

                <span>
                  After
                  <strong>
                    {stockModal.mode ===
                    "in"
                      ? number(
                          Number(
                            stockModal.item
                              .quantity
                          ) +
                            (Number(
                              stockForm.quantity
                            ) || 0)
                        )
                      : stockModal.mode ===
                          "out"
                        ? number(
                            Math.max(
                              Number(
                                stockModal.item
                                  .quantity
                              ) -
                                (Number(
                                  stockForm.quantity
                                ) || 0),
                              0
                            )
                          )
                        : number(
                            Math.max(
                              Number(
                                stockForm
                                  .new_quantity
                              ) || 0,
                              0
                            )
                          )}
                  </strong>
                </span>
              </div>

              <div
                className={
                  styles.modalFooter
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setStockModal(null)
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
                    : stockModal.mode ===
                        "in"
                      ? "Add Stock"
                      : stockModal.mode ===
                          "out"
                        ? "Remove Stock"
                        : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}

      {historyModal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setHistoryModal(null);
            }
          }}
        >
          <div
            className={
              styles.historyModal
            }
          >
            <div className={styles.modalHeader}>
              <div>
                <span>
                  STOCK HISTORY
                </span>

                <h2>
                  {historyModal.name}
                </h2>
              </div>

              <button
                onClick={() =>
                  setHistoryModal(null)
                }
              >
                ×
              </button>
            </div>

            <div
              className={
                styles.historySummary
              }
            >
              <span>
                Current Stock
                <strong>
                  {number(
                    historyModal.quantity
                  )}{" "}
                  {historyModal.unit}
                </strong>
              </span>

              <span>
                Minimum Stock
                <strong>
                  {number(
                    historyModal.minimum_stock
                  )}{" "}
                  {historyModal.unit}
                </strong>
              </span>

              <span>
                Supplier
                <strong>
                  {historyModal.supplier ||
                    "—"}
                </strong>
              </span>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Previous</th>
                    <th>New</th>
                    <th>Reference</th>
                    <th>Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedHistory.map(
                    (transaction) => (
                      <tr
                        key={
                          transaction.id
                        }
                      >
                        <td>
                          {new Date(
                            transaction.created_at
                          ).toLocaleString(
                            "en-IN",
                            {
                              dateStyle:
                                "medium",
                              timeStyle:
                                "short",
                            }
                          )}
                        </td>

                        <td>
                          {
                            transaction.transaction_type
                          }
                        </td>

                        <td>
                          {number(
                            transaction.quantity
                          )}
                        </td>

                        <td>
                          {number(
                            transaction.previous_quantity
                          )}
                        </td>

                        <td>
                          {number(
                            transaction.new_quantity
                          )}
                        </td>

                        <td>
                          {transaction.reference ||
                            "—"}
                        </td>

                        <td>
                          {transaction.notes ||
                            "—"}
                        </td>
                      </tr>
                    )
                  )}

                  {!selectedHistory.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className={
                          styles.empty
                        }
                      >
                        No stock history
                        available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              className={
                styles.modalFooter
              }
            >
              <button
                onClick={() =>
                  setHistoryModal(null)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
