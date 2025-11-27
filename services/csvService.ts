import Papa from 'papaparse';
import { SourceFormat, SourceRow, ShopifyRow, ConversionStats } from '../types';

// The exact column order required by Shopify
const SHOPIFY_HEADER_ORDER = [
  "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags", "Published",
  "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Option3 Name", "Option3 Value",
  "Variant SKU", "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Qty", 
  "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price",
  "Variant Requires Shipping", "Variant Taxable", "Variant Barcode", "Image Src", "Image Position",
  "Image Alt Text", "Gift Card", "SEO Title", "SEO Description",
  "Google Shopping / Google Product Category", "Google Shopping / Gender", "Google Shopping / Age Group",
  "Google Shopping / MPN", "Google Shopping / Condition", "Google Shopping / Custom Product",
  "Google Shopping / Custom Label 0", "Google Shopping / Custom Label 1", "Google Shopping / Custom Label 2",
  "Google Shopping / Custom Label 3", "Google Shopping / Custom Label 4", "Variant Image", 
  "Variant Weight Unit", "Status", "Collection"
];

// Helper to slugify text for Handles
const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
};

const cleanText = (text: any): string => {
  if (text === null || text === undefined) return '';
  return String(text).trim();
};

// Helper to get value from multiple possible keys (case insensitive)
const getVal = (row: SourceRow, keys: string[]): string => {
    // 1. Exact match
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') return cleanText(row[key]);
    }
    // 2. Case insensitive match
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        const foundKey = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
            return cleanText(row[foundKey]);
        }
    }
    return '';
};

// Special helper for WooCommerce Parent ID which can be in 'Genitore' column OR pattern matched
const findWooParentId = (row: SourceRow): string => {
    // 1. Try standard columns
    let val = getVal(row, ['Parent', 'Genitore', 'genitore']);
    if (val) return val.replace(/^id:\s*/i, '').trim();

    // 2. Scan ALL values for the "id:123" pattern. 
    // WooCommerce exports OFTEN put "id:123" in the parent column.
    // If headers are messed up, this is a failsafe.
    const values = Object.values(row);
    for (const v of values) {
        if (typeof v === 'string' && v.trim().match(/^id:\s*\d+$/i)) {
            return v.replace(/^id:\s*/i, '').trim();
        }
    }
    return '';
};

export const parseCSV = (file: File): Promise<SourceRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Aggressively clean headers: remove BOM, trim, remove surrounding quotes
        return header.replace(/^\ufeff/, '').trim().replace(/^["'](.*)["']$/, '$1');
      },
      complete: (results) => {
        if (results.errors.length > 0 && !results.data.length) {
          reject(new Error("Failed to parse CSV: " + results.errors[0].message));
        } else {
          resolve(results.data as SourceRow[]);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const detectFormat = (data: SourceRow[]): SourceFormat => {
  if (!data || data.length === 0) return SourceFormat.UNKNOWN;
  
  const headers = Object.keys(data[0]);
  const lowerHeaders = headers.map(h => h.toLowerCase());

  // WooCommerce Detection
  if (lowerHeaders.includes('genitore') || lowerHeaders.includes('prezzo di listino')) return SourceFormat.WOOCOMMERCE;
  if (lowerHeaders.includes('parent') && lowerHeaders.includes('regular price')) return SourceFormat.WOOCOMMERCE;
  if (lowerHeaders.includes('id') && lowerHeaders.some(h => h.includes('attributo'))) return SourceFormat.WOOCOMMERCE;

  // Wix Detection - supports multiple export formats
  // Format 1: handle + fieldType + media (original/legacy format)
  if (lowerHeaders.includes('handle') && lowerHeaders.includes('fieldtype')) return SourceFormat.WIX;
  // Format 2: URL handle + Type + Product image URL (newer format)
  if (lowerHeaders.includes('url handle') && lowerHeaders.includes('type')) return SourceFormat.WIX;
  // Format 3: By specific Wix columns
  if (lowerHeaders.includes('handleid') || (lowerHeaders.includes('product image url') && lowerHeaders.includes('productoption'))) return SourceFormat.WIX;

  // PrestaShop Detection
  if (lowerHeaders.includes('price tax excluded') || (lowerHeaders.includes('active') && lowerHeaders.includes('quantity'))) return SourceFormat.PRESTASHOP;

  return SourceFormat.UNKNOWN;
};

// --- MAPPING LOGIC ---

const createBaseShopifyRow = (): ShopifyRow => ({
  Handle: '', Title: '', 'Body (HTML)': '', Vendor: '', 'Product Category': '', Type: '', Tags: '', Published: 'TRUE',
  'Option1 Name': '', 'Option1 Value': '', 'Option2 Name': '', 'Option2 Value': '', 'Option3 Name': '', 'Option3 Value': '',
  'Variant SKU': '', 'Variant Grams': '0', 'Variant Inventory Tracker': 'shopify', 'Variant Inventory Qty': '0',
  'Variant Inventory Policy': 'deny', 'Variant Fulfillment Service': 'manual', 'Variant Price': '0.00',
  'Variant Compare At Price': '', 'Variant Requires Shipping': 'TRUE', 'Variant Taxable': 'TRUE', 'Variant Barcode': '',
  'Image Src': '', 'Image Position': '', 'Image Alt Text': '', 'Gift Card': 'FALSE',
  'SEO Title': '', 'SEO Description': '',
  'Google Shopping / Google Product Category': '', 'Google Shopping / Gender': '', 'Google Shopping / Age Group': '',
  'Google Shopping / MPN': '', 'Google Shopping / Condition': '', 'Google Shopping / Custom Product': '',
  'Google Shopping / Custom Label 0': '', 'Google Shopping / Custom Label 1': '', 'Google Shopping / Custom Label 2': '',
  'Google Shopping / Custom Label 3': '', 'Google Shopping / Custom Label 4': '', 'Variant Image': '',
  'Variant Weight Unit': 'kg', Status: 'active', Collection: ''
});

const mapWooCommerce = (data: SourceRow[]): { rows: ShopifyRow[], stats: ConversionStats } => {
  const shopifyRows: ShopifyRow[] = [];
  const warnings: string[] = [];
  
  // Map ID -> Handle to link variations to parents
  const idToHandleMap = new Map<string, string>();
  
  // Pass 1: Identify Parents and generate Handles
  // Track handles to detect duplicates
  const handleCount = new Map<string, number>();
  
  data.forEach((row) => {
      const type = getVal(row, ['Type', 'Tipo']).toLowerCase();
      const id = getVal(row, ['ID', 'id']);
      
      // Identifying a parent:
      // 1. Explicit type (simple, variable, external, grouped)
      // 2. OR Not a variation type AND has no parent ID
      const isVariation = type.includes('variation') || type.includes('variazione');
      const parentId = findWooParentId(row);
      
      // It's a parent if it's NOT a variation, or if it explicitly says 'variable'/'simple'
      // Note: Sometimes "simple, virtual" contains comma
      const isParent = !isVariation && (type.includes('variable') || type.includes('simple') || !parentId);

      if (isParent && id) {
          let name = getVal(row, ['Name', 'Nome', 'Title']);
          // If name is missing, fallback
          if (!name) name = `product-${id}`;
          
          let handle = slugify(name);
          
          // Check if this handle already exists (duplicate product names)
          // If so, append the product ID to make it unique
          if (handleCount.has(handle)) {
              handle = `${handle}-${id}`;
          }
          handleCount.set(handle, (handleCount.get(handle) || 0) + 1);
          
          idToHandleMap.set(id, handle);
      }
  });

  // Pass 2: Generate Shopify Rows
  data.forEach((row, index) => {
      const type = getVal(row, ['Type', 'Tipo']).toLowerCase();
      const id = getVal(row, ['ID', 'id']);
      const parentId = findWooParentId(row);
      const name = getVal(row, ['Name', 'Nome', 'Title']);

      const isVariation = type.includes('variation') || type.includes('variazione');
      
      // Re-evaluate isParent for this specific row logic
      // If it has a parentId, it's definitely a child, regardless of type label quirks
      const isChild = !!parentId; 
      const isParent = !isChild; // Strictly distinct in this logic

      // Determine Handle
      let handle = '';
      
      if (isChild) {
          // It is a variant. MUST use parent's handle.
          handle = idToHandleMap.get(parentId) || '';
          
          // Fallback: If parent wasn't found in Pass 1, we force a handle based on ParentID.
          // This guarantees that all variants of ID 1234 get "product-1234" and thus GROUP TOGETHER in Shopify.
          if (!handle) {
              handle = `product-${parentId}`;
          }
      } else {
          // It's a parent row
          handle = idToHandleMap.get(id) || '';
          if (!handle && id) handle = `product-${id}`; // Fallback
      }

      if (!handle) {
          // Skip rows that have no ID and no parent ID (likely garbage)
          return; 
      }

      const newRow = createBaseShopifyRow();
      newRow.Handle = handle;

      // Common Data Mapping
      if (isParent) {
          // Parent Data
          newRow.Title = getVal(row, ['Name', 'Nome', 'Title']);
          newRow['Body (HTML)'] = getVal(row, ['Description', 'Descrizione']);
          newRow.Vendor = getVal(row, ['Vendor', 'Marchi', 'Brands']);
          
          // Categories & Tags
          const cats = getVal(row, ['Categories', 'Categorie']);
          const tags = getVal(row, ['Tags', 'Tag']);
          const catList = cats.split(',').map(s => s.trim()).filter(s => s);
          const tagList = tags.split(',').map(s => s.trim()).filter(s => s);

          if (catList.length > 0) newRow.Type = catList[0]; 
          const allTags = [...new Set([...catList, ...tagList])];
          newRow.Tags = allTags.join(', ');

          const published = getVal(row, ['Published', 'Pubblicato']);
          const isPub = (published === '1' || published.toLowerCase() === 'true');
          newRow.Published = isPub ? 'TRUE' : 'FALSE';
          newRow.Status = isPub ? 'active' : 'draft';
      } else {
          // Child/Variant Data - MUST leave Published/Status EMPTY for variants
          // Shopify only reads these from the first row (parent)
          newRow.Title = '';
          newRow['Body (HTML)'] = '';
          newRow.Vendor = '';
          newRow.Type = '';
          newRow.Tags = '';
          newRow.Published = '';
          newRow.Status = '';
          newRow['Product Category'] = '';
      }

      // --- VARIANT SPECIFIC DATA ---
      // For variable products, only variants (children) should have prices
      // The parent row should have empty price
      const isVariableProduct = type.includes('variable');
      
    if (isParent && isVariableProduct) {
        // Parent of variable product: Empty MOST variant fields
        // But KEEP Fulfillment Service & Inventory Policy - they are MANDATORY!
        newRow['Variant Price'] = '';
        newRow['Variant Compare At Price'] = '';
        newRow['Variant SKU'] = '';
        newRow['Variant Grams'] = '';
        newRow['Variant Inventory Tracker'] = '';
        newRow['Variant Inventory Qty'] = '';
        newRow['Variant Barcode'] = '';
        // These are REQUIRED by Shopify - keep them!
        // newRow['Variant Fulfillment Service'] = 'manual'; // Already set by createBaseShopifyRow
        // newRow['Variant Inventory Policy'] = 'deny'; // Already set by createBaseShopifyRow
        // These cause "Default Title" if populated - MUST be empty for parent!
        newRow['Variant Requires Shipping'] = '';
        newRow['Variant Taxable'] = '';
    } else {
          // Simple products OR variations: set prices
          const regularPrice = getVal(row, ['Regular price', 'Prezzo di listino']);
          const salePrice = getVal(row, ['Sale price', 'Prezzo in offerta']);
          
          const regP = parseFloat(regularPrice.replace(',', '.')) || 0;
          const saleP = parseFloat(salePrice.replace(',', '.')) || 0;

          if (saleP > 0 && saleP < regP) {
              newRow['Variant Price'] = saleP.toString();
              newRow['Variant Compare At Price'] = regP.toString();
          } else if (regP > 0) {
              newRow['Variant Price'] = regP.toString();
              newRow['Variant Compare At Price'] = '';
          } else {
              // No price found: set 0.00 for simple products, or inherit from parent for variations
              // Shopify requires a price for all variants
              newRow['Variant Price'] = '0.00';
              newRow['Variant Compare At Price'] = '';
          }

          newRow['Variant SKU'] = getVal(row, ['SKU', 'sku']);
      
          const stockQty = getVal(row, ['Stock', 'Stock quantity', 'Magazzino', 'Quantità']);
          // Clean text stock (e.g. "10" or just "10")
          newRow['Variant Inventory Qty'] = stockQty ? stockQty.replace(/[^\d-]/g, '') : '0';
          
          const weight = getVal(row, ['Weight (kg)', 'Peso (kg)']);
          if (weight) {
              const wNum = parseFloat(weight.replace(',', '.'));
              if (!isNaN(wNum)) {
                  newRow['Variant Grams'] = Math.round(wNum * 1000).toString();
              }
          }
      }

      // --- OPTIONS / ATTRIBUTES ---
      // Map up to 3 options ONLY for variable products and their variations
      // Simple products without variations should NOT have options
      let optionIndex = 1;
      
      // Only process options if this is a variable product OR a variation
      const shouldHaveOptions = type.includes('variable') || type.includes('variation') || type.includes('variazione');
      
      if (shouldHaveOptions) {
          // Try to find up to 3 attributes
          // We loop blindly because sometimes they are "Attribute 1 name" or "Nome dell'attributo 1"
          for (let i = 1; i <= 10; i++) { // Scan up to 10 slots, pick first 3 valid ones
              if (optionIndex > 3) break;

              const nameKey = [`Attribute ${i} name`, `Nome dell'attributo ${i}`];
              const valKey = [`Attribute ${i} value(s)`, `Valore dell'attributo ${i}`];
              const visibleKey = [`Attribute ${i} visible`, `Attributo ${i} visibile`]; // Optional check

              const optName = getVal(row, nameKey);
              const optVal = getVal(row, valKey);

              if (optName && optVal) {
                  // Valid attribute found
                  if (isParent) {
                      // Parent row defines Option Names
                      newRow[`Option${optionIndex} Name` as keyof ShopifyRow] = optName;
                      // Variable parent: leave value empty so variants can define their own values
                      newRow[`Option${optionIndex} Value` as keyof ShopifyRow] = ''; 
                  } else {
                      // Child row (variation)
                      newRow[`Option${optionIndex} Name` as keyof ShopifyRow] = optName;
                      newRow[`Option${optionIndex} Value` as keyof ShopifyRow] = optVal;
                  }
                  optionIndex++;
              }
          }
      }

      // --- IMAGES ---
      const imagesStr = getVal(row, ['Images', 'Immagine']);
      const images = imagesStr.split(',').map(s => s.trim()).filter(s => s);

      if (isParent) {
          // Add first image to this row
          if (images.length > 0) {
              newRow['Image Src'] = images[0];
              newRow['Image Position'] = '1';
              newRow['Image Alt Text'] = newRow.Title;
              shopifyRows.push(newRow);

              // Create extra rows for additional images (2..N)
              for (let k = 1; k < images.length; k++) {
                  // Create minimal image-only row with only essential fields
                  const imgRow: ShopifyRow = {
                      Handle: handle,
                      'Image Src': images[k],
                      'Image Position': (k + 1).toString(),
                      'Image Alt Text': newRow.Title,
                      // All other fields completely empty
                      Title: '', 'Body (HTML)': '', Vendor: '', 'Product Category': '', Type: '', Tags: '', Published: '',
                      'Option1 Name': '', 'Option1 Value': '', 'Option2 Name': '', 'Option2 Value': '', 'Option3 Name': '', 'Option3 Value': '',
                      'Variant SKU': '', 'Variant Grams': '', 'Variant Inventory Tracker': '', 'Variant Inventory Qty': '',
                      'Variant Inventory Policy': '', 'Variant Fulfillment Service': '', 'Variant Price': '', 'Variant Compare At Price': '',
                      'Variant Requires Shipping': '', 'Variant Taxable': '', 'Variant Barcode': '', 'Variant Image': '', 'Variant Weight Unit': '',
                      'Gift Card': '', 'SEO Title': '', 'SEO Description': '',
                      'Google Shopping / Google Product Category': '', 'Google Shopping / Gender': '', 'Google Shopping / Age Group': '',
                      'Google Shopping / MPN': '', 'Google Shopping / Condition': '', 'Google Shopping / Custom Product': '',
                      'Google Shopping / Custom Label 0': '', 'Google Shopping / Custom Label 1': '', 'Google Shopping / Custom Label 2': '',
                      'Google Shopping / Custom Label 3': '', 'Google Shopping / Custom Label 4': '', Status: '', Collection: ''
                  };
                  
                  shopifyRows.push(imgRow);
              }
          } else {
              shopifyRows.push(newRow);
          }
      } else {
          // Variant Row
          if (images.length > 0) {
              newRow['Variant Image'] = images[0]; // Specific variant image
          }
          shopifyRows.push(newRow);
      }
  });

  // Final Check: Filter out rows that are pure duplicates or empty handles
  const validRows = shopifyRows.filter(r => r.Handle);

  // POST-PROCESSING: Group rows by handle and sort them correctly
  // Shopify requires: parent first, then variants, then image-only rows
  const rowsByHandle = new Map<string, ShopifyRow[]>();
  validRows.forEach(row => {
      const handle = row.Handle;
      if (!rowsByHandle.has(handle)) {
          rowsByHandle.set(handle, []);
      }
      rowsByHandle.get(handle)!.push(row);
  });

  // Reorder rows within each product: parent → variants → images
  rowsByHandle.forEach((rows, handle) => {
      rows.sort((a, b) => {
          const aIsParent = a.Title && a.Title !== '';
          const bIsParent = b.Title && b.Title !== '';
          const aHasOption = a['Option1 Value'] && a['Option1 Value'] !== '';
          const bHasOption = b['Option1 Value'] && b['Option1 Value'] !== '';
          const aHasPrice = a['Variant Price'] && a['Variant Price'] !== '' && a['Variant Price'] !== '0' && a['Variant Price'] !== '0.00';
          const bHasPrice = b['Variant Price'] && b['Variant Price'] !== '' && b['Variant Price'] !== '0' && b['Variant Price'] !== '0.00';
          
          // Classify each row
          const aIsVariant = aHasOption || aHasPrice; // Has option OR price = variant
          const bIsVariant = bHasOption || bHasPrice;
          const aIsImage = !aIsParent && !aIsVariant; // No title, no option, no price = image
          const bIsImage = !bIsParent && !bIsVariant;
          
          // Sorting order: parent (0) → variants (1) → images (2)
          const getOrder = (isParent: boolean, isVariant: boolean, isImage: boolean) => {
              if (isParent) return 0;
              if (isVariant) return 1;
              if (isImage) return 2;
              return 3;
          };
          
          const aOrder = getOrder(aIsParent, aIsVariant, aIsImage);
          const bOrder = getOrder(bIsParent, bIsVariant, bIsImage);
          
          return aOrder - bOrder;
      });
  });

  // Fill missing variant prices with price from other variants of same product
  rowsByHandle.forEach((rows, handle) => {
      // Find first valid price in this product's variants
      let referencePrice = '';
      for (const row of rows) {
          const price = row['Variant Price'];
          if (price && price !== '' && price !== '0' && price !== '0.00') {
              referencePrice = price;
              break;
          }
      }
      
      // If we found a reference price, apply it to variants without price
      if (referencePrice) {
          rows.forEach(row => {
              const currentPrice = row['Variant Price'];
              // Only fill if it's a variant row (has Option1 Value) and has no price or price is 0
              const hasOption = row['Option1 Value'] && row['Option1 Value'] !== '';
              const needsPrice = !currentPrice || currentPrice === '' || currentPrice === '0' || currentPrice === '0.00';
              
              if (hasOption && needsPrice) {
                  row['Variant Price'] = referencePrice;
              }
          });
      }
  });

  // Remove options with constant values (all variants have the same value)
  rowsByHandle.forEach((rows, handle) => {
      const variantRows = rows.filter(r => r['Option1 Value'] && r['Option1 Value'] !== '');
      if (variantRows.length <= 1) return; // Skip if 0 or 1 variant
      
      // Check each option to see if it's constant across all variants
      const constantOptions: boolean[] = [false, false, false];
      
      for (let i = 0; i < 3; i++) {
          const optionName = i === 0 ? 'Option1' : i === 1 ? 'Option2' : 'Option3';
          const nameKey = `${optionName} Name` as keyof ShopifyRow;
          const valueKey = `${optionName} Value` as keyof ShopifyRow;
          
          // Get all unique values for this option across variants
          const values = new Set(variantRows.map(r => r[valueKey] || '').filter(v => v !== ''));
          
          // If this option has exactly 1 unique value across all variants, it's constant
          if (values.size === 1) {
              constantOptions[i] = true;
          }
      }
      
      // If any options are constant, remove them and shift remaining options
      if (constantOptions.some(c => c)) {
          rows.forEach(row => {
              const newOptions: Array<{name: string, value: string}> = [];
              
              // Collect non-constant options
              for (let i = 0; i < 3; i++) {
                  if (!constantOptions[i]) {
                      const optionName = i === 0 ? 'Option1' : i === 1 ? 'Option2' : 'Option3';
                      const nameKey = `${optionName} Name` as keyof ShopifyRow;
                      const valueKey = `${optionName} Value` as keyof ShopifyRow;
                      const name = row[nameKey] as string || '';
                      const value = row[valueKey] as string || '';
                      if (name || value) {
                          newOptions.push({name, value});
                      }
                  }
              }
              
              // Clear all options
              row['Option1 Name'] = '';
              row['Option1 Value'] = '';
              row['Option2 Name'] = '';
              row['Option2 Value'] = '';
              row['Option3 Name'] = '';
              row['Option3 Value'] = '';
              
              // Reassign non-constant options starting from Option1
              newOptions.forEach((opt, idx) => {
                  const optionName = idx === 0 ? 'Option1' : idx === 1 ? 'Option2' : 'Option3';
                  const nameKey = `${optionName} Name` as keyof ShopifyRow;
                  const valueKey = `${optionName} Value` as keyof ShopifyRow;
                  (row[nameKey] as string) = opt.name;
                  (row[valueKey] as string) = opt.value;
              });
          });
      }
  });

  // Rebuild the final array with correctly ordered rows
  const finalRows: ShopifyRow[] = [];
  rowsByHandle.forEach((rows) => {
      finalRows.push(...rows);
  });

  // Stats calculation
  const uniqueHandles = new Set(finalRows.map(r => r.Handle));
  // Count actual variants (rows with a price that are not just extra image rows)
  const variantCount = finalRows.filter(r => r['Variant Price'] && r['Variant Price'] !== '').length;
  
  return { 
      rows: finalRows, 
      stats: { 
          totalProducts: uniqueHandles.size, 
          totalVariants: variantCount, 
          warnings 
      } 
  };
};

const mapWix = (data: SourceRow[]): { rows: ShopifyRow[], stats: ConversionStats } => {
  const shopifyRows: ShopifyRow[] = [];
  const warnings: string[] = [];
  
  // Group by Handle
  const groups: Record<string, { product?: SourceRow, variants: SourceRow[], media: string[] }> = {};

  data.forEach((row, index) => {
    let handle = cleanText(row['URL handle'] || row['handle'] || row['handleId']);
    if (!handle) {
       const name = cleanText(row['Title'] || row['name']);
       if (name) handle = slugify(name);
    }
    
    if (!handle) {
         return;
    }

    if (!groups[handle]) groups[handle] = { variants: [], media: [] };

    const fieldType = cleanText(row['Type'] || row['fieldType']).toUpperCase();
    
    if (fieldType === 'PRODUCT') {
        groups[handle].product = row;
        // Try both new format (Product image URL) and old format (media)
        const m = cleanText(row['Product image URL'] || row['media'] || row['productImageUrl']);
        if (m) groups[handle].media.push(m);
    } else if (fieldType === 'VARIANT') {
        groups[handle].variants.push(row);
    } else if (fieldType === 'MEDIA') {
        // Try both formats
        const m = cleanText(row['Product image URL'] || row['media']);
        if (m) groups[handle].media.push(m);
    } else {
        // Fallback for simple rows without explicit fieldType
        const title = cleanText(row['Title'] || row['name']);
        const hasSku = cleanText(row['sku']);
        const hasPrice = cleanText(row['price']);
        
        // Only set as product if it has a title and not already set
        if (title && !groups[handle].product) {
            groups[handle].product = row;
            // Also check for media in product row (old Wix format)
            const m = cleanText(row['Product image URL'] || row['media'] || row['productImageUrl']);
            if (m) groups[handle].media.push(m);
        }
        // Only add as variant if it has actual variant data (sku/price) but no title
        // (to avoid adding product rows as variants)
        else if ((hasSku || hasPrice) && !title) {
            groups[handle].variants.push(row);
        }
    }
  });

  const totalProducts = Object.keys(groups).length;
  let totalVariants = 0;
  
  console.log('Sample groups:', Object.keys(groups).slice(0, 3).map(h => ({
    handle: h,
    hasProduct: !!groups[h].product,
    variantsCount: groups[h].variants.length,
    mediaCount: groups[h].media.length
  })));

  for (const handle of Object.keys(groups)) {
      const group = groups[handle];
      const product = group.product || group.variants[0];
      
      if (!product) continue;

      // Wix Images: Prepend CDN URL if just filename
      let allImages: string[] = [];
      group.media.forEach(m => {
          const parts = m.split(/[\n;]/).map(s => s.trim()).filter(s => s);
          parts.forEach(p => {
              if (p.startsWith('http') || p.startsWith('//')) {
                  allImages.push(p);
              } else {
                  allImages.push(`https://static.wixstatic.com/media/${p}`);
              }
          });
      });
      allImages = Array.from(new Set(allImages));

      const variants = group.variants.length > 0 ? group.variants : [product];
      totalVariants += variants.length;


      let rowsForThisProduct = 0;
      
      // First, create rows for all variants
      variants.forEach((variant, i) => {
          const newRow = createBaseShopifyRow();
          newRow.Handle = handle;
          rowsForThisProduct++;

          // Only first variant row gets product-level data
          if (i === 0) {
              newRow.Title = cleanText(product['Title'] || product['name']);
              newRow['Body (HTML)'] = cleanText(product['Description'] || product['description'] || product['plainDescription']);
              newRow.Vendor = cleanText(product['Vendor'] || product['brand']);
              newRow.Tags = cleanText(product['ribbon'] || product['ribbons'] || product['brand']);
              
              const visible = cleanText(product['Published on online store'] || product['visible']);
              // Handle both 'true'/'false' and '1'/'0' values
              const isPub = (visible.toLowerCase() === 'true' || visible === '1' || visible.toLowerCase() === 'yes');
              newRow.Published = isPub ? 'TRUE' : 'FALSE';
              newRow.Status = isPub ? 'active' : 'draft';
              
              const prodType = cleanText(product['Type'] || product['productType']);
              if (prodType && prodType !== 'PRODUCT' && prodType !== 'VARIANT' && prodType !== 'MEDIA') newRow.Type = prodType;

              // Add first image to first variant row
              if (allImages.length > 0) {
                  newRow['Image Src'] = allImages[0];
                  newRow['Image Position'] = '1';
                  newRow['Image Alt Text'] = newRow.Title;
              }
          } else {
              // For subsequent variants (i > 0), clear product-level fields
              newRow.Title = '';
              newRow['Body (HTML)'] = '';
              newRow.Vendor = '';
              newRow.Tags = '';
              newRow.Published = '';  // CRITICAL: Must be empty for variants!
              newRow.Status = '';     // CRITICAL: Must be empty for variants!
              newRow.Type = '';
              newRow['Product Category'] = '';
          }

          // Variant-specific data (for all variant rows)
          newRow['Variant SKU'] = cleanText(variant['sku']);
          newRow['Variant Price'] = cleanText(variant['price']);
          newRow['Variant Compare At Price'] = cleanText(variant['Compare-at price'] || variant['strikethroughPrice'] || variant['comparePrice']);
          newRow['Variant Barcode'] = cleanText(variant['barcode']);
          
          // Inventory - Wix uses different formats: numbers or "IN_STOCK"/"OUT_OF_STOCK"
          let invQty = cleanText(variant['inventory'] || variant['Inventory tracker'] || '0');
          // Handle IN_STOCK/OUT_OF_STOCK text values
          if (invQty.toUpperCase() === 'IN_STOCK') invQty = '1';
          if (invQty.toUpperCase() === 'OUT_OF_STOCK') invQty = '0';
          newRow['Variant Inventory Qty'] = invQty;
          newRow['Variant Inventory Tracker'] = 'shopify';
          newRow['Variant Requires Shipping'] = 'TRUE';
          newRow['Variant Taxable'] = 'TRUE';

          const weight = cleanText(variant['weight']);
          const weightNum = parseFloat(weight);
          if (!isNaN(weightNum)) {
              newRow['Variant Grams'] = Math.round(weightNum * 1000).toString();
              newRow['Variant Weight Unit'] = 'g';
          }

          // Options - Wix can use multiple formats
          let optionsFilled = 0;
          
          // Format 1: Try standard "Option1 name" / "Option1 value" (new Wix format)
          for (let opt = 1; opt <= 3; opt++) {
              const optNameStd = cleanText(variant[`Option${opt} name`]);
              const optValStd = cleanText(variant[`Option${opt} value`]);
              
              if (optNameStd && optValStd) {
                  optionsFilled++;
                  newRow[`Option${optionsFilled} Name` as keyof ShopifyRow] = optNameStd;
                  newRow[`Option${optionsFilled} Value` as keyof ShopifyRow] = optValStd;
              }
          }
          
          // Format 2: Try "productOptionName1-6" / "productOptionChoices1-6" (original Wix format)
          if (optionsFilled === 0) {
              for (let opt = 1; opt <= 6; opt++) {
                  const optNameAlt = cleanText(variant[`productOptionName${opt}`]);
                  const optValAlt = cleanText(variant[`productOptionChoices${opt}`]);
                  
                  if (optNameAlt && optValAlt && optionsFilled < 3) {
                      optionsFilled++;
                      newRow[`Option${optionsFilled} Name` as keyof ShopifyRow] = optNameAlt;
                      newRow[`Option${optionsFilled} Value` as keyof ShopifyRow] = optValAlt;
                  }
              }
          }
          
          // If it's NOT the first variant and still no options found, set default "Title" option
          // This prevents Shopify from treating it as a separate product
          if (i > 0 && optionsFilled === 0) {
              newRow['Option1 Name'] = 'Title';
              newRow['Option1 Value'] = 'Default Title';
          }

          shopifyRows.push(newRow);
      });

      // Then, create additional image-only rows for images 2+
      for (let imgIdx = 1; imgIdx < allImages.length; imgIdx++) {
          // Create minimal image-only row with only essential fields
          const imgRow: ShopifyRow = {
              Handle: handle,
              'Image Src': allImages[imgIdx],
              'Image Position': (imgIdx + 1).toString(),
              'Image Alt Text': cleanText(product['Title'] || product['name']),
              // All other fields completely empty
              Title: '', 'Body (HTML)': '', Vendor: '', 'Product Category': '', Type: '', Tags: '', Published: '',
              'Option1 Name': '', 'Option1 Value': '', 'Option2 Name': '', 'Option2 Value': '', 'Option3 Name': '', 'Option3 Value': '',
              'Variant SKU': '', 'Variant Grams': '', 'Variant Inventory Tracker': '', 'Variant Inventory Qty': '',
              'Variant Inventory Policy': '', 'Variant Fulfillment Service': '', 'Variant Price': '', 'Variant Compare At Price': '',
              'Variant Requires Shipping': '', 'Variant Taxable': '', 'Variant Barcode': '', 'Variant Image': '', 'Variant Weight Unit': '',
              'Gift Card': '', 'SEO Title': '', 'SEO Description': '',
              'Google Shopping / Google Product Category': '', 'Google Shopping / Gender': '', 'Google Shopping / Age Group': '',
              'Google Shopping / MPN': '', 'Google Shopping / Condition': '', 'Google Shopping / Custom Product': '',
              'Google Shopping / Custom Label 0': '', 'Google Shopping / Custom Label 1': '', 'Google Shopping / Custom Label 2': '',
              'Google Shopping / Custom Label 3': '', 'Google Shopping / Custom Label 4': '', Status: '', Collection: ''
          };
          
          shopifyRows.push(imgRow);
          rowsForThisProduct++;
      }
  }

  return { rows: shopifyRows, stats: { totalProducts, totalVariants, warnings } };
};

const mapPrestaShop = (data: SourceRow[]): { rows: ShopifyRow[], stats: ConversionStats } => {
  const shopifyRows: ShopifyRow[] = [];
  const warnings: string[] = [];
  const seenHandles = new Set<string>();

  data.forEach((row, index) => {
      const name = cleanText(row['Name']);
      const id = cleanText(row['ID']);
      
      let handle = slugify(name);
      if (!handle) handle = `product-${id}`; 

      const isFirstVariant = !seenHandles.has(handle);
      seenHandles.add(handle);

      const newRow = createBaseShopifyRow();
      newRow.Handle = handle;

      if (isFirstVariant) {
          newRow.Title = name;
          newRow['Body (HTML)'] = cleanText(row['Description'] || row['description_short']);
          
          const active = cleanText(row['Active']);
          const isPub = (active === '1' || active.toLowerCase() === 'yes');
          newRow.Published = isPub ? 'TRUE' : 'FALSE';
          newRow.Status = isPub ? 'active' : 'draft';

          const cats = cleanText(row['Categories']);
          const catArr = cats.split(',').map(c => c.trim()).filter(c => c);
          if (catArr.length > 0) newRow.Type = catArr[0];
          if (catArr.length > 1) newRow.Tags = catArr.slice(1).join(', ');
      } else {
          newRow.Title = '';
          newRow['Body (HTML)'] = '';
          newRow.Type = '';
          newRow.Tags = '';
          newRow.Published = '';
          newRow.Status = '';
      }

      newRow['Variant Price'] = cleanText(row['Price tax excluded'] || row['Price']);
      newRow['Variant SKU'] = cleanText(row['Reference'] || row['reference']);
      newRow['Variant Inventory Qty'] = cleanText(row['Quantity'] || '0');

      const weight = cleanText(row['Weight']);
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum)) {
          newRow['Variant Grams'] = Math.round(weightNum * 1000).toString();
          newRow['Variant Weight Unit'] = 'g';
      }

      const imageUrls = cleanText(row['Image URLs'] || row['Image url']).split(',').map(i => i.trim()).filter(i => i);
      
      if (imageUrls.length > 0) {
          if (isFirstVariant) {
              newRow['Image Src'] = imageUrls[0];
              newRow['Image Position'] = '1';
              shopifyRows.push(newRow);

              for (let i = 1; i < imageUrls.length; i++) {
                  // Create minimal image-only row with only essential fields
                  const imgRow: ShopifyRow = {
                      Handle: handle,
                      'Image Src': imageUrls[i],
                      'Image Position': (i + 1).toString(),
                      'Image Alt Text': name,
                      // All other fields completely empty
                      Title: '', 'Body (HTML)': '', Vendor: '', 'Product Category': '', Type: '', Tags: '', Published: '',
                      'Option1 Name': '', 'Option1 Value': '', 'Option2 Name': '', 'Option2 Value': '', 'Option3 Name': '', 'Option3 Value': '',
                      'Variant SKU': '', 'Variant Grams': '', 'Variant Inventory Tracker': '', 'Variant Inventory Qty': '',
                      'Variant Inventory Policy': '', 'Variant Fulfillment Service': '', 'Variant Price': '', 'Variant Compare At Price': '',
                      'Variant Requires Shipping': '', 'Variant Taxable': '', 'Variant Barcode': '', 'Variant Image': '', 'Variant Weight Unit': '',
                      'Gift Card': '', 'SEO Title': '', 'SEO Description': '',
                      'Google Shopping / Google Product Category': '', 'Google Shopping / Gender': '', 'Google Shopping / Age Group': '',
                      'Google Shopping / MPN': '', 'Google Shopping / Condition': '', 'Google Shopping / Custom Product': '',
                      'Google Shopping / Custom Label 0': '', 'Google Shopping / Custom Label 1': '', 'Google Shopping / Custom Label 2': '',
                      'Google Shopping / Custom Label 3': '', 'Google Shopping / Custom Label 4': '', Status: '', Collection: ''
                  };
                  
                  shopifyRows.push(imgRow);
              }
          } else {
               shopifyRows.push(newRow);
          }
      } else {
          shopifyRows.push(newRow);
      }
  });

  return { rows: shopifyRows, stats: { totalProducts: seenHandles.size, totalVariants: shopifyRows.filter(r => r['Variant Price']).length, warnings } };
};

export const transformData = (data: SourceRow[], format: SourceFormat): { rows: ShopifyRow[], stats: ConversionStats } => {
  switch (format) {
    case SourceFormat.WOOCOMMERCE:
      return mapWooCommerce(data);
    case SourceFormat.WIX:
      return mapWix(data);
    case SourceFormat.PRESTASHOP:
      return mapPrestaShop(data);
    default:
      return { rows: [], stats: { totalProducts: 0, totalVariants: 0, warnings: ['Unknown format'] } };
  }
};

export const generateCSV = (rows: ShopifyRow[]): string => {
  const csv = Papa.unparse(rows, {
    quotes: true,
    delimiter: ",",
    columns: SHOPIFY_HEADER_ORDER // Strict column ordering
  });
  return '\ufeff' + csv; // BOM for Excel
};
