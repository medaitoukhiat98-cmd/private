import * as XLSX from "xlsx";
import type { CommandeDetail, StockActuel, MouvementStock } from "./supabase";

const FR_DATE = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

const STATUT_FR: Record<string, string> = {
  pending: "En attente",
  partial: "Réception partielle",
  received: "Réceptionnée",
  cancelled: "Annulée",
};

// ─── EXCEL ────────────────────────────────────────────────────────────────────

export function exportCommandesExcel(commandes: CommandeDetail[]) {
  const rows = commandes.map((c, i) => ({
    "#": i + 1,
    Article: c.article_nom,
    Famille: c.famille ?? "",
    Catégorie: c.categorie ?? "",
    Fournisseur: c.fournisseur_nom ?? "",
    "Qté commandée": c.quantite_commandee,
    "Qté reçue": c.quantite_recue,
    "Qté restante": c.quantite_restante,
    Unité: c.unite,
    "Date commande": FR_DATE(c.date_commande),
    "Livraison prévue": FR_DATE(c.date_prevue_livraison),
    Statut: STATUT_FR[c.statut] ?? c.statut,
    Note: c.note ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 4 }, { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 20 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 14 },
    { wch: 16 }, { wch: 20 }, { wch: 30 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Commandes");
  XLSX.writeFile(wb, `natberry_commandes_${today()}.xlsx`);
}

export function exportStockExcel(stock: StockActuel[]) {
  const rows = stock.map((s) => ({
    Article: s.article_nom,
    Famille: s.famille ?? "",
    Catégorie: s.categorie ?? "",
    Unité: s.unite ?? "",
    "Total entrées": Number(s.total_entrees).toFixed(2),
    "Total sorties": Number(s.total_sorties).toFixed(2),
    "Stock actuel": Number(s.stock_actuel).toFixed(2),
    "Dernière activité": FR_DATE(s.derniere_activite),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 8 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock");
  XLSX.writeFile(wb, `natberry_stock_${today()}.xlsx`);
}

export function exportHistoriqueExcel(mouvements: (MouvementStock & { article_nom: string })[]) {
  const rows = mouvements.map((m) => ({
    Date: new Date(m.date_mouvement).toLocaleString("fr-FR"),
    Article: m.article_nom,
    Type: m.type,
    Quantité: Number(m.quantite).toFixed(2),
    Unité: m.unite ?? "",
    Origine: m.reception_id ? "Réception commande" : m.commande_id ? "Commande" : "Manuel",
    Remarques: m.remarque ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Historique");
  XLSX.writeFile(wb, `natberry_historique_${today()}.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function exportCommandesPDF(commandes: CommandeDetail[]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("NATBERRY 16 — Liste des Commandes", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Exporté le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["#", "Article", "Famille", "Fournisseur", "Cmd", "Reçue", "Restante", "Unité", "Date Cmd", "Livraison", "Statut"]],
    body: commandes.map((c, i) => [
      i + 1,
      c.article_nom,
      c.famille ?? "",
      c.fournisseur_nom ?? "—",
      c.quantite_commandee,
      c.quantite_recue,
      c.quantite_restante,
      c.unite,
      FR_DATE(c.date_commande),
      FR_DATE(c.date_prevue_livraison),
      STATUT_FR[c.statut] ?? c.statut,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [108, 99, 255], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    columnStyles: {
      0: { cellWidth: 8 },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
  });

  doc.save(`natberry_commandes_${today()}.pdf`);
}

export async function exportStockPDF(stock: StockActuel[]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("NATBERRY 16 — État du Stock", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Exporté le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["Article", "Famille", "Catégorie", "Entrées", "Sorties", "Stock actuel", "Dernière activité"]],
    body: stock.map((s) => [
      s.article_nom,
      s.famille ?? "",
      s.categorie ?? "",
      Number(s.total_entrees).toFixed(2),
      Number(s.total_sorties).toFixed(2),
      Number(s.stock_actuel).toFixed(2),
      FR_DATE(s.derniere_activite),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [108, 99, 255], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
  });

  doc.save(`natberry_stock_${today()}.pdf`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split("T")[0];
}
