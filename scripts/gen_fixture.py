# -*- coding: utf-8 -*-
"""从 test-old-date 抽取脱敏样例到 fixtures/legacy-import/。可重复运行。

客户：5 个单联系人 + CNSHK0001 的两行联系人。
供应商：8 行，至少 3 个类别，名称加「测试」前缀。
商品：10 行，其中 V1XLJ1001 保留 3 行变体。
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path

import openpyxl
import xlrd
import xlwt

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "test-old-date"
OUT = ROOT / "fixtures" / "legacy-import"

CUSTOMER_FILE = "客户导出_20260701114803.xls"
SUPPLIER_FILE = "供应商导出_20260701112136.xls"
PRODUCT_FILE = "商品导出_20260701235503.xlsx"

MULTI_CUSTOMER = "CNSHK0001"
MULTI_PRODUCT = "V1XLJ1001"
ADDRESS = "XX省XX市XX路XX号"
PHONE = "138****0001"
TAX_ID = "A123****78"
SINGLE_CUSTOMER_COUNT = 5
SUPPLIER_COUNT = 8
PRODUCT_VARIANT_ROWS = 3
PRODUCT_SINGLE_COUNT = 7


def xls_cell(sheet, row: int, col: int) -> str:
    cell = sheet.cell(row, col)
    if cell.ctype == xlrd.XL_CELL_NUMBER:
        number = cell.value
        if number == int(number):
            return str(int(number))
        return str(number)
    if cell.ctype == xlrd.XL_CELL_EMPTY:
        return ""
    return str(cell.value).strip()


def xls_row(sheet, row: int) -> list[str]:
    return [xls_cell(sheet, row, col) for col in range(sheet.ncols)]


def write_xls(path: Path, rows: list[list[str]]) -> None:
    book = xlwt.Workbook()
    sheet = book.add_sheet("Sheet1")
    for r, row in enumerate(rows):
        for c, value in enumerate(row):
            sheet.write(r, c, value)
    path.parent.mkdir(parents=True, exist_ok=True)
    book.save(str(path))


def desensitize_customer(row: list[str], contact_name: str, customer_name: str) -> list[str]:
    out = list(row)
    # 客户类别、客户编号、客户等级、首要联系人保留结构；其余身份信息替换。
    out[2] = customer_name
    out[3] = TAX_ID
    out[4] = ""
    out[5] = ""
    out[6] = "测试销售"
    out[8] = contact_name
    out[9] = PHONE
    out[10] = ""
    out[11] = ""
    out[12] = ADDRESS
    return out


def build_customers() -> list[list[str]]:
    path = SOURCE / CUSTOMER_FILE
    book = xlrd.open_workbook(path)
    sheet = book.sheet_by_index(0)
    header = [xls_row(sheet, 0), xls_row(sheet, 1)]
    grouped: dict[str, list[list[str]]] = defaultdict(list)
    order: list[str] = []
    for row_idx in range(2, sheet.nrows):
        row = xls_row(sheet, row_idx)
        code = row[1].strip() if len(row) > 1 else ""
        if not code:
            continue
        if code not in grouped:
            order.append(code)
        grouped[code].append(row)
    if MULTI_CUSTOMER not in grouped or len(grouped[MULTI_CUSTOMER]) < 2:
        raise SystemExit(f"{CUSTOMER_FILE} 里没有两行 {MULTI_CUSTOMER}")
    singles = [code for code in order if code != MULTI_CUSTOMER and len(grouped[code]) == 1]
    if len(singles) < SINGLE_CUSTOMER_COUNT:
        raise SystemExit(f"单联系人客户不足 {SINGLE_CUSTOMER_COUNT} 个")
    rows = list(header)
    for offset, code in enumerate(singles[:SINGLE_CUSTOMER_COUNT]):
        name = f"客户{chr(ord('C') + offset)}"
        rows.append(desensitize_customer(grouped[code][0], name, name))
    multi_rows = grouped[MULTI_CUSTOMER][:2]
    rows.append(desensitize_customer(multi_rows[0], "客户A", "客户A"))
    rows.append(desensitize_customer(multi_rows[1], "客户B", "客户A"))
    return rows


def build_suppliers() -> list[list[str]]:
    path = SOURCE / SUPPLIER_FILE
    book = xlrd.open_workbook(path)
    sheet = book.sheet_by_index(0)
    header = [xls_row(sheet, 0), xls_row(sheet, 1)]
    by_category: dict[str, list[list[str]]] = defaultdict(list)
    category_order: list[str] = []
    for row_idx in range(2, sheet.nrows):
        row = xls_row(sheet, row_idx)
        code = row[1].strip() if len(row) > 1 else ""
        if not code or "供应商编号" in code:
            continue
        category = row[0].strip()
        if category not in by_category:
            category_order.append(category)
        by_category[category].append(row)
    picked: list[list[str]] = []
    cursors = {category: 0 for category in category_order}
    while len(picked) < SUPPLIER_COUNT:
        progressed = False
        for category in category_order:
            index = cursors[category]
            if index >= len(by_category[category]):
                continue
            row = list(by_category[category][index])
            cursors[category] = index + 1
            name = row[2].strip() if len(row) > 2 else ""
            if not name.startswith("测试"):
                row[2] = f"测试{name}" if name else "测试供应商"
            picked.append(row)
            progressed = True
            if len(picked) >= SUPPLIER_COUNT:
                break
        if not progressed:
            break
    categories = {row[0].strip() for row in picked}
    if len(picked) != SUPPLIER_COUNT:
        raise SystemExit(f"供应商数据行不足 {SUPPLIER_COUNT}")
    if len(categories) < 3:
        raise SystemExit(f"供应商类别只有 {len(categories)} 个")
    return header + picked


def xlsx_rows(path: Path) -> list[list[str]]:
    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = book.active
    rows: list[list[str]] = []
    width = 0
    for row in sheet.iter_rows(values_only=True):
        values = ["" if value is None else str(value).strip() for value in row]
        width = max(width, len(values))
        rows.append(values)
    book.close()
    return [row + [""] * (width - len(row)) for row in rows]


def build_products() -> list[list[str]]:
    rows = xlsx_rows(SOURCE / PRODUCT_FILE)
    if len(rows) < 3:
        raise SystemExit(f"{PRODUCT_FILE} 行数不足")
    header = rows[:2]
    data = rows[2:]
    sku_idx = next(i for i, name in enumerate(header[1]) if "商品编号" in name)
    name_idx = next(i for i, name in enumerate(header[1]) if "商品名称" in name)
    spec_idx = next((i for i, name in enumerate(header[1]) if "规格" in name), None)
    grouped: dict[str, list[list[str]]] = defaultdict(list)
    order: list[str] = []
    for row in data:
        code = row[sku_idx].strip()
        if not code:
            continue
        if code not in grouped:
            order.append(code)
        grouped[code].append(row)
    if MULTI_PRODUCT not in grouped or len(grouped[MULTI_PRODUCT]) < PRODUCT_VARIANT_ROWS:
        raise SystemExit(f"{MULTI_PRODUCT} 变体不足 {PRODUCT_VARIANT_ROWS} 行")
    singles = [code for code in order if len(grouped[code]) == 1]
    if len(singles) < PRODUCT_SINGLE_COUNT:
        raise SystemExit(f"单 SKU 商品不足 {PRODUCT_SINGLE_COUNT} 个")
    out = list(header)
    variant_names = ["商品A", "商品B", "商品C"]
    for offset, source in enumerate(grouped[MULTI_PRODUCT][:PRODUCT_VARIANT_ROWS]):
        row = list(source)
        row[name_idx] = variant_names[offset]
        if spec_idx is not None:
            row[spec_idx] = f"规格{variant_names[offset][-1]}"
        out.append(row)
    for offset, code in enumerate(singles[:PRODUCT_SINGLE_COUNT]):
        row = list(grouped[code][0])
        row[name_idx] = f"商品{chr(ord('D') + offset)}"
        if spec_idx is not None:
            row[spec_idx] = ""
        out.append(row)
    return out


def write_xlsx(path: Path, rows: list[list[str]]) -> None:
    book = openpyxl.Workbook()
    sheet = book.active
    sheet.title = "Sheet1"
    for r, row in enumerate(rows, start=1):
        for c, value in enumerate(row, start=1):
            sheet.cell(r, c, value)
    path.parent.mkdir(parents=True, exist_ok=True)
    book.save(path)


def main() -> None:
    if not SOURCE.is_dir():
        raise SystemExit(f"找不到原始目录 {SOURCE}")
    customers = build_customers()
    suppliers = build_suppliers()
    products = build_products()
    write_xls(OUT / CUSTOMER_FILE, customers)
    write_xls(OUT / SUPPLIER_FILE, suppliers)
    write_xlsx(OUT / PRODUCT_FILE, products)
    print(f"客户表头 2 + 数据 {len(customers) - 2} -> {OUT / CUSTOMER_FILE}")
    print(f"供应商表头 2 + 数据 {len(suppliers) - 2} -> {OUT / SUPPLIER_FILE}")
    print(f"商品表头 2 + 数据 {len(products) - 2} -> {OUT / PRODUCT_FILE}")


if __name__ == "__main__":
    main()
