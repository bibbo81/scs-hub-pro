const CONTAINER_CBM_CAPACITY = {
    "20'": 33.2,
    "40'": 67.7,
    "40'HC": 76.4,
    "45'HC": 86.0,
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Aspetta che i servizi siano disponibili (caricati dall'HTML)
        await waitForServices();
        
        await window.headerComponent?.init();
        await window.dataManager?.init();

        // Assicurati che Supabase sia disponibile globalmente
        if (!window.supabase) {
            console.warn('Supabase not available globally, trying to initialize...');
            if (typeof supabase !== 'undefined') {
                const { createClient } = supabase;
                window.supabase = createClient(
                    'https://gnlrmnsdmpjzitsysowq.supabase.co',
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubnJtbnNkbXBqeml0c3lzb3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk3OTI3OTQsImV4cCI6MjA0NTM2ODc5NH0.nBBLNL4OGHqXcj_0qXUYx95UwjJDcZXuKvQDmjq5B3k'
                );
            }
        }

        const shipmentId = getShipmentIdFromURL();
        if (!shipmentId) {
            window.notificationSystem?.error("ID Spedizione non trovato nell'URL.");
            return;
        }

        await loadShipmentDetails(shipmentId);
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing shipment details page:', error);
        window.notificationSystem?.error("Errore nell'inizializzazione della pagina.");
    }
});

// Aspetta che i servizi siano disponibili
async function waitForServices() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.dataManager && window.notificationSystem && window.headerComponent && window.ModalSystem) {
            console.log('✅ All services are available');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('Services not available after timeout');
}

function getShipmentIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function getTransportModeName(transportModeId) {
    if (!transportModeId) return '-';
    
    try {
        const { data, error } = await window.supabase
            .from('transport_modes')
            .select('name')
            .eq('id', transportModeId)
            .single();
        
        if (error) throw error;
        return data?.name || '-';
    } catch (error) {
        console.warn('Error fetching transport mode name:', error);
        return '-';
    }
}

async function getVehicleTypeName(vehicleTypeId) {
    if (!vehicleTypeId) return '-';
    
    try {
        const { data, error } = await window.supabase
            .from('vehicle_types')
            .select('name')
            .eq('id', vehicleTypeId)
            .single();
        
        if (error) throw error;
        return data?.name || '-';
    } catch (error) {
        console.warn('Error fetching vehicle type name:', error);
        return '-';
    }
}

// ✅ CACHE PER EVITARE CHIAMATE RIPETUTE
let isLoadingShipment = false;

async function loadShipmentDetails(shipmentId) {
    // ✅ PREVIENI CHIAMATE MULTIPLE SIMULTANEE
    if (isLoadingShipment) {
        console.log('⚠️ Shipment loading already in progress, skipping...');
        return;
    }
    
    isLoadingShipment = true;
    
    try {
        console.log('🔍 Loading shipment details for ID:', shipmentId);
        
        const shipmentDetails = await window.dataManager.getShipmentDetails(shipmentId);
        if (!shipmentDetails) {
            window.notificationSystem?.error("Spedizione non trovata.");
            return;
        }

        console.log('📦 Raw shipment details:', shipmentDetails);

        // FIX: Assicura che i dati di tracking siano sempre caricati
        if (shipmentDetails.tracking) {
            console.log('✅ Tracking data found in shipment');
            if (shipmentDetails.tracking.transport_mode_id) {
                shipmentDetails.tracking.transport_modes = { 
                    name: await getTransportModeName(shipmentDetails.tracking.transport_mode_id) 
                };
            }
            if (shipmentDetails.tracking.vehicle_type_id) {
                shipmentDetails.tracking.vehicle_types = { 
                    name: await getVehicleTypeName(shipmentDetails.tracking.vehicle_type_id) 
                };
            }
        } else if (shipmentDetails.tracking_number) {
            console.log(`🔍 [FIX] No tracking data found. Attempting recovery with tracking_number: ${shipmentDetails.tracking_number}`);
            
            if (window.supabase && window.dataManager?.organizationId) {
                const { data: trackingRecords, error: trackingError } = await window.supabase
                    .from('trackings')
                    .select('*')
                    .ilike('tracking_number', shipmentDetails.tracking_number.trim())
                    .eq('organization_id', window.dataManager.organizationId)
                    .order('updated_at', { ascending: false })
                    .limit(1);

                if (trackingError) {
                    console.warn('[FIX] Error recovering tracking:', trackingError.message);
                } else if (trackingRecords && trackingRecords.length > 0) {
                    const trackingRecord = trackingRecords[0];
                    console.log('✅ [FIX] Tracking recovery successful!', trackingRecord);
                    shipmentDetails.tracking = trackingRecord;
                    
                    // Populate transport and vehicle type names
                    if (trackingRecord.transport_mode_id) {
                        shipmentDetails.tracking.transport_modes = { 
                            name: await getTransportModeName(trackingRecord.transport_mode_id) 
                        };
                    }
                    if (trackingRecord.vehicle_type_id) {
                        shipmentDetails.tracking.vehicle_types = { 
                            name: await getVehicleTypeName(trackingRecord.vehicle_type_id) 
                        };
                    }
                }
            }
        }
                    
        await renderShipmentInfo(shipmentDetails);
        renderProductsTable(shipmentDetails);  // ⬅️ QUESTA È CRUCIALE!
        await renderDocumentsTable(shipmentDetails.documents);
        renderAdditionalCosts(shipmentDetails.additionalCosts);

        window.editProductCosts = editProductCosts;
        window.setupCostCalculation = setupCostCalculation;
        window.updateCostCalculation = updateCostCalculation;
        window.saveProductCosts = saveProductCosts;
        
        // Store shipment globally for re-render
        window.currentShipment = shipmentDetails;
        
        console.log('✅ Product cost functions exposed after shipment load:', {
            editProductCosts: typeof window.editProductCosts,
            setupCostCalculation: typeof window.setupCostCalculation,
            updateCostCalculation: typeof window.updateCostCalculation,
            saveProductCosts: typeof window.saveProductCosts
        });
        
    } catch (error) {
        console.error("Error loading shipment details:", error);
        window.notificationSystem?.error("Impossibile caricare i dettagli della spedizione.");
    } finally {
        // ✅ IMPORTANTE: Rilascia sempre il lock
        isLoadingShipment = false;
    }
}

async function renderShipmentInfo(shipment) {
    console.log('📦 DEBUG shipment:', shipment);
    console.log('📦 DEBUG tracking:', shipment.tracking);
    
    document.getElementById('shipmentNumberTitle').textContent = `Spedizione ${shipment.shipment_number || ''}`;
    document.getElementById('shipmentNumber').textContent = shipment.shipment_number || '-';

    // 1. STATO: Prioritizza i dati dalla spedizione, poi dal tracking
    const statusToDisplay = shipment.status || shipment.tracking?.current_status || shipment.tracking?.status || 'registered';
    document.getElementById('shipmentStatus').innerHTML = formatStatus(statusToDisplay);

    document.getElementById('shipmentDate').textContent = formatDate(shipment.created_at);

    // 2. ORIGINE/DESTINAZIONE: Prioritizza i dati dalla spedizione
    document.getElementById('shipmentOrigin').textContent = shipment.origin || shipment.origin_port || shipment.tracking?.origin_port || '-';
    document.getElementById('shipmentDestination').textContent = shipment.destination || shipment.destination_port || shipment.tracking?.destination_port || '-';

    // 3. TIPO CONTAINER: Calcola dinamicamente dai dati di tracking se disponibili
    const containers = shipment.tracking?.metadata?.raw?.shipment?.containers;
    if (Array.isArray(containers) && containers.length > 0) {
        const typeSummary = containers.reduce((acc, container) => {
            const size = container.size || 0;
            const type = (container.type || '').toUpperCase();
            let summaryType = 'N/A';

            if (size === 20) summaryType = "20'";
            else if (size === 40) summaryType = (type.includes('HC') || type.includes('HQ')) ? "40'HC" : "40'";
            else if (size === 45) summaryType = "45'HC";
            
            if (summaryType !== 'N/A') {
                acc[summaryType] = (acc[summaryType] || 0) + 1;
            }
            return acc;
        }, {});
        document.getElementById('shipmentContainerTypes').textContent = Object.entries(typeSummary).map(([type, count]) => `${count}x${type}`).join(', ') || '-';
    } else {
        document.getElementById('shipmentContainerTypes').textContent = shipment.tracking?.container_types || '-';
    }

    // 4. MODALITÀ DI TRASPORTO E TIPO VEICOLO: Prioritizza i dati dalla spedizione
    const transportModeId = shipment.transport_mode_id || shipment.tracking?.transport_mode_id;
    const vehicleTypeId = shipment.vehicle_type_id || shipment.tracking?.vehicle_type_id;
    
    const transportModeName = shipment.tracking?.transport_modes?.name || await getTransportModeName(transportModeId);
    const vehicleTypeName = shipment.tracking?.vehicle_types?.name || await getVehicleTypeName(vehicleTypeId);
    
    document.getElementById('shipmentTransportMode').textContent = transportModeName;
    document.getElementById('shipmentVehicleType').textContent = vehicleTypeName;
    
    // 5. PESO E VOLUME: Prioritizza i dati dalla spedizione (per spedizioni manuali)
    const totalWeight = shipment.total_weight_kg || shipment.tracking?.total_weight_kg || 0;
    const totalVolume = shipment.total_volume_cbm || shipment.tracking?.total_volume_cbm || 0;
    
    document.getElementById('shipmentTotalWeight').textContent = formatWeight(totalWeight);
    document.getElementById('shipmentTotalVolume').textContent = formatVolume(totalVolume);

    // 6. 🔥 FIX: SEPARAZIONE CORRETTA TRA SPEDIZIONIERE E COMPAGNIA
// Spedizioniere (partner per i costi)
let spedizioniere = '-';
if (shipment.carrier?.name) {
    // Spedizioniere dalla tabella carriers
    spedizioniere = shipment.carrier.name;
} else if (shipment.carrier_name) {
    // Fallback al campo carrier_name
    spedizioniere = shipment.carrier_name;
} else if (shipment.tracking?.carrier_id && shipment.tracking?.carriers?.name) {
    // Modalità manuale: usa il nome dalla relazione carriers
    spedizioniere = shipment.tracking.carriers.name;
}
document.getElementById('shipmentCarrier').textContent = spedizioniere;

// Compagnia di trasporto (operativa)
let compagniaTrasporto = '-';
if (shipment.tracking?.transport_company) {
    // Campo dedicato per compagnia di trasporto
    compagniaTrasporto = shipment.tracking.transport_company;
} else if (!shipment.tracking?.carrier_id && shipment.tracking?.carrier_name) {
    // Se non è modalità manuale, usa carrier_name come compagnia
    compagniaTrasporto = shipment.tracking.carrier_name;
}
document.getElementById('shipmentTrackingCarrier').textContent = compagniaTrasporto;
    // 🔥 CORREZIONE: Costi nei campi input - FORMATO INTERNAZIONALE per HTML
    const freightCostInput = document.getElementById('freightCost');
    const otherCostsInput = document.getElementById('otherCosts');
    
    // Usa il formato internazionale (punto per decimali) negli input HTML
    if (freightCostInput) freightCostInput.value = (shipment.freight_cost || 0).toString();
    if (otherCostsInput) otherCostsInput.value = (shipment.other_costs || 0).toString();
    
    updateTotalCost();
}

function calculateTotalMaxCBM(containerTypeString) {
    if (!containerTypeString || containerTypeString === '-') return 0;
    let totalCBM = 0;
    const parts = containerTypeString.split(',');
    parts.forEach(part => {
        const match = part.trim().match(/(\d+)x(.+)/);
        if (match) {
            const count = parseInt(match[1], 10);
            const type = match[2].trim();
            const capacity = CONTAINER_CBM_CAPACITY[type] || 0;
            totalCBM += count * capacity;
        }
    });
    return totalCBM;
}

function renderProductsTable(shipment) {
    console.log('🔄 renderProductsTable called with:', {
        productsCount: shipment?.products?.length || 0,
        shipmentId: shipment?.id
    });

    const products = shipment.products || [];
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) {
        console.error('❌ productsTableBody not found!');
        return;
    }
    
    tbody.innerHTML = '';

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center">Nessun prodotto associato.</td></tr>';
        updateTotalsWithCosts([], shipment);
        return;
    }

    // ✅ CALCOLA I COSTI DI TRASPORTO
    const transportCosts = calculateTransportCosts(shipment, products);
    
    // ✅ AGGIORNA I METADATI DEI PRODOTTI CON I COSTI DI TRASPORTO
    products.forEach(product => {
        if (!product.cost_metadata) {
            product.cost_metadata = {};
        }
        product.cost_metadata.transportUnitCost = transportCosts.allocatedCosts[product.id] ? 
            transportCosts.allocatedCosts[product.id] / product.quantity : 0;
    });

    // ✅ USA LA FUNZIONE renderProductRow CORRETTA
    products.forEach(shipmentProduct => {
        const product = shipmentProduct.product || null;
        const rowHTML = renderProductRow(shipmentProduct, product);
        tbody.innerHTML += rowHTML;
    });
    
    updateTotalsWithCosts(products, shipment);
    
    setTimeout(() => {
        const addedCostButtons = tbody.querySelectorAll('.product-costs-btn');
        console.log('✅ renderProductsTable completed:', {
            rowsAdded: tbody.children.length,
            costButtonsAdded: addedCostButtons.length,
            formatFunctionsAvailable: {
                formatCurrencyIT: typeof window.formatCurrencyIT,
                formatNumberIT: typeof window.formatNumberIT,
                formatPercentageIT: typeof window.formatPercentageIT
            }
        });
    }, 100);
}

function updateTotalsWithCosts(products, shipment) {
    let totalQuantity = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    let totalProductCost = 0;
    let totalDuty = 0;
    let totalTransportCost = 0;
    let weightedDutyRate = 0;
    let totalUnitCostWeighted = 0;
    let totalDutyUnitWeighted = 0;
    let totalTransportUnitWeighted = 0;
    
    products.forEach(shipmentProduct => {
        // ✅ CORREZIONE: Usa i campi salvati nel database PRIMA dei metadati
        const costs = shipmentProduct.cost_metadata || {};
        const unitCost = shipmentProduct.unit_cost || costs.unitCost || 0;
        const productTotal = shipmentProduct.total_cost || costs.totalCost || (unitCost * shipmentProduct.quantity);
        const dutyRate = shipmentProduct.duty_rate || costs.dutyRate || 0;
        const dutyAmount = shipmentProduct.duty_amount || costs.dutyAmount || (productTotal * (dutyRate / 100));
        
        // ✅ CORREZIONE: CALCOLO CORRETTO DEL DAZIO UNITARIO
        const dutyUnitCost = shipmentProduct.quantity > 0 ? dutyAmount / shipmentProduct.quantity : 0;
        
        const transportUnitCost = costs.transportUnitCost || 0;
        const transportProductTotal = transportUnitCost * shipmentProduct.quantity;
        
        totalQuantity += shipmentProduct.quantity || 0;
        totalWeight += shipmentProduct.total_weight_kg || 0;
        totalVolume += shipmentProduct.total_volume_cbm || 0;
        totalProductCost += productTotal;
        totalDuty += dutyAmount;
        totalTransportCost += transportProductTotal;
        
        // Medie ponderate
        if (productTotal > 0) {
            weightedDutyRate += dutyRate * productTotal;
        }
        totalUnitCostWeighted += unitCost * (shipmentProduct.quantity || 0);
        totalDutyUnitWeighted += dutyUnitCost * (shipmentProduct.quantity || 0);
        totalTransportUnitWeighted += transportUnitCost * (shipmentProduct.quantity || 0);
    });
    
    const avgDutyRate = totalProductCost > 0 ? weightedDutyRate / totalProductCost : 0;
    const avgUnitCost = totalQuantity > 0 ? totalUnitCostWeighted / totalQuantity : 0;
    const avgDutyUnit = totalQuantity > 0 ? totalDutyUnitWeighted / totalQuantity : 0;
    const avgTransportUnit = totalQuantity > 0 ? totalTransportUnitWeighted / totalQuantity : 0;
    
    // Aggiorna i totali nella tabella
    const elements = {
        totalQuantity: document.getElementById('totalQuantity'),
        totalWeight: document.getElementById('totalWeight'),
        totalVolume: document.getElementById('totalVolume'),
        averageUnitCost: document.getElementById('averageUnitCost'),
        totalProductCost: document.getElementById('totalProductCost'),
        averageDutyRate: document.getElementById('averageDutyRate'),
        averageDutyUnit: document.getElementById('averageDutyUnit'),
        totalDuty: document.getElementById('totalDuty'),
        averageTransportUnit: document.getElementById('averageTransportUnit'),
        totalTransportCost: document.getElementById('totalTransportCost')
    };
    
    if (elements.totalQuantity) elements.totalQuantity.textContent = window.formatNumberIT ? window.formatNumberIT(totalQuantity) : totalQuantity;
    if (elements.totalWeight) elements.totalWeight.textContent = formatWeight(totalWeight);
    if (elements.totalVolume) elements.totalVolume.textContent = formatVolume(totalVolume);
    if (elements.averageUnitCost) elements.averageUnitCost.textContent = window.formatCurrencyIT ? window.formatCurrencyIT(avgUnitCost) : `€ ${avgUnitCost.toFixed(2)}`;
    if (elements.totalProductCost) elements.totalProductCost.textContent = window.formatCurrencyIT ? window.formatCurrencyIT(totalProductCost) : `€ ${totalProductCost.toFixed(2)}`;
    if (elements.averageDutyRate) elements.averageDutyRate.textContent = window.formatPercentageIT ? window.formatPercentageIT(avgDutyRate) : `${avgDutyRate.toFixed(1)}%`;
    if (elements.averageDutyUnit) elements.averageDutyUnit.textContent = window.formatCurrencyIT ? window.formatCurrencyIT(avgDutyUnit) : `€ ${avgDutyUnit.toFixed(2)}`;
    if (elements.totalDuty) elements.totalDuty.textContent = window.formatCurrencyIT ? window.formatCurrencyIT(totalDuty) : `€ ${totalDuty.toFixed(2)}`;
    if (elements.averageTransportUnit) elements.averageTransportUnit.textContent = window.formatCurrencyIT ? window.formatCurrencyIT(avgTransportUnit) : `€ ${avgTransportUnit.toFixed(2)}`;
    if (elements.totalTransportCost) elements.totalTransportCost.textContent = window.formatCurrencyIT ? window.formatCurrencyIT(totalTransportCost) : `€ ${totalTransportCost.toFixed(2)}`;

    console.log('📊 Totals updated with Italian format:', {
        totalQuantity,
        totalProductCost: totalProductCost.toFixed(2),
        totalDuty: totalDuty.toFixed(2),
        totalTransportCost: totalTransportCost.toFixed(2),
        avgDutyUnit: avgDutyUnit.toFixed(4) // ✅ DEBUG per vedere se viene calcolato
    });
}

function calculateTransportCosts(shipment, products) {
    const freightCost = shipment.freight_cost || 0;
    const otherCosts = shipment.other_costs || 0;
    const totalShipmentCosts = freightCost + otherCosts;
    
    if (totalShipmentCosts === 0 || products.length === 0) {
        return { unitCost: 0, allocatedCosts: {} };
    }
    
    // ✅ DETERMINA IL TIPO DI TRASPORTO
    const transportMode = shipment.tracking?.transport_modes?.name || 
                         shipment.transport_mode?.name || 
                         'manual';
    
    console.log('🚛 Transport mode detected:', transportMode);
    
    let totalBasis = 0;
    let allocationMethod = 'equal'; // Default fallback
    
    // ✅ LOGICA SPECIFICA PER TIPO DI TRASPORTO
    if (transportMode.toLowerCase().includes('mare') || 
        transportMode.toLowerCase().includes('sea') || 
        transportMode.toLowerCase().includes('ocean')) {
        
        // 🚢 SPEDIZIONI MARITTIME: Solo CBM
        allocationMethod = 'volume';
        totalBasis = products.reduce((sum, p) => sum + (p.total_volume_cbm || 0), 0);
        console.log('🚢 Maritime shipping: using CBM only, total:', totalBasis);
        
    } else if (transportMode.toLowerCase().includes('aer') || 
               transportMode.toLowerCase().includes('air') || 
               transportMode.toLowerCase().includes('cargo')) {
        
        // ✈️ SPEDIZIONI AEREE: Peso vs Volume con coefficiente 1:167
        allocationMethod = 'weight_volume_max';
        const totalWeight = products.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
        const totalVolume = products.reduce((sum, p) => sum + (p.total_volume_cbm || 0), 0);
        const volumetricWeight = totalVolume * 167; // Coefficiente 1:167kg per CBM
        
        totalBasis = Math.max(totalWeight, volumetricWeight);
        console.log('✈️ Air shipping:', {
            totalWeight,
            totalVolume,
            volumetricWeight,
            selectedBasis: totalBasis,
            method: totalWeight > volumetricWeight ? 'actual_weight' : 'volumetric_weight'
        });
        
    } else {
        
        // 🚛 SPEDIZIONI MANUALI: Usa il campo disponibile
        allocationMethod = 'flexible';
        const totalWeight = products.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
        const totalVolume = products.reduce((sum, p) => sum + (p.total_volume_cbm || 0), 0);
        
        if (totalVolume > 0 && totalWeight > 0) {
            // Entrambi disponibili: usa il volume (preferenza arbitraria)
            totalBasis = totalVolume;
            allocationMethod = 'volume';
        } else if (totalVolume > 0) {
            // Solo volume disponibile
            totalBasis = totalVolume;
            allocationMethod = 'volume';
        } else if (totalWeight > 0) {
            // Solo peso disponibile
            totalBasis = totalWeight;
            allocationMethod = 'weight';
        } else {
            // Nessun dato: distribuzione equa
            totalBasis = products.length;
            allocationMethod = 'equal';
        }
        
        console.log('🚛 Manual shipping:', {
            totalWeight,
            totalVolume,
            selectedBasis: totalBasis,
            method: allocationMethod
        });
    }
    
    // ✅ FALLBACK: Se non c'è base per il calcolo, distribuisci equamente
    if (totalBasis === 0) {
        console.warn('⚠️ No basis for cost allocation, using equal distribution');
        const unitCost = totalShipmentCosts / products.length;
        const allocatedCosts = {};
        products.forEach(p => {
            allocatedCosts[p.id] = unitCost;
        });
        return { unitCost, allocatedCosts };
    }
    
    // ✅ CALCOLA IL COSTO UNITARIO E ALLOCA AI PRODOTTI
    const costPerUnit = totalShipmentCosts / totalBasis;
    const allocatedCosts = {};
    
    products.forEach(product => {
        let productBasis = 0;
        
        switch (allocationMethod) {
            case 'volume':
                productBasis = product.total_volume_cbm || 0;
                break;
                
            case 'weight':
                productBasis = product.total_weight_kg || 0;
                break;
                
            case 'weight_volume_max':
                const productWeight = product.total_weight_kg || 0;
                const productVolume = product.total_volume_cbm || 0;
                const productVolumetricWeight = productVolume * 167;
                productBasis = Math.max(productWeight, productVolumetricWeight);
                break;
                
            case 'flexible':
                // Per spedizioni manuali, usa quello che è disponibile
                if ((product.total_volume_cbm || 0) > 0 && (product.total_weight_kg || 0) > 0) {
                    productBasis = product.total_volume_cbm; // Preferenza volume
                } else if ((product.total_volume_cbm || 0) > 0) {
                    productBasis = product.total_volume_cbm;
                } else if ((product.total_weight_kg || 0) > 0) {
                    productBasis = product.total_weight_kg;
                } else {
                    productBasis = 1; // Fallback per distribuzione equa
                }
                break;
                
            case 'equal':
            default:
                productBasis = 1;
                break;
        }
        
        allocatedCosts[product.id] = costPerUnit * productBasis;
    });
    
    console.log('💰 Transport cost allocation completed:', {
        method: allocationMethod,
        totalBasis,
        costPerUnit: costPerUnit.toFixed(4),
        totalAllocated: Object.values(allocatedCosts).reduce((sum, cost) => sum + cost, 0).toFixed(2)
    });
    
    return { unitCost: costPerUnit, allocatedCosts };
}

function renderProductRow(shipmentProduct, product) {
    console.log('🔄 renderProductRow:', {
        productId: shipmentProduct.id,
        productName: product?.name || shipmentProduct.product?.name || shipmentProduct.name,
        savedCosts: {
            unit_cost: shipmentProduct.unit_cost,
            total_cost: shipmentProduct.total_cost,
            duty_rate: shipmentProduct.duty_rate,
            duty_amount: shipmentProduct.duty_amount,
            duty_unit_cost: shipmentProduct.duty_unit_cost
        },
        costMetadata: shipmentProduct.cost_metadata
    });
    
    // ✅ PRIORITÀ AI CAMPI SALVATI NEL DATABASE
    const unitCost = shipmentProduct.unit_cost || 0;
    const totalCost = shipmentProduct.total_cost || (unitCost * shipmentProduct.quantity);
    const dutyRate = shipmentProduct.duty_rate || 0;
    const dutyAmount = shipmentProduct.duty_amount || (totalCost * (dutyRate / 100));
    const dutyUnitCost = shipmentProduct.duty_unit_cost || 
                        (shipmentProduct.quantity > 0 ? dutyAmount / shipmentProduct.quantity : 0);
    
    // ✅ COSTI DI TRASPORTO DAI METADATI
    const costs = shipmentProduct.cost_metadata || {};
    const transportUnitCost = costs.transportUnitCost || 0;
    const transportTotal = transportUnitCost * shipmentProduct.quantity;
    
    // ✅ NOME PRODOTTO CON PRIORITÀ CORRETTA
    const productName = product?.name || 
                       shipmentProduct.product?.name || 
                       shipmentProduct.name || 
                       'Prodotto senza nome';
    const productSku = product?.sku || 
                      shipmentProduct.product?.sku || 
                      shipmentProduct.sku || 
                      'N/A';
    
    // ✅ FORMATTAZIONE DINAMICA PER VALORI PICCOLI
    const formatSmallCurrency = (value) => {
        if (value === 0) return '€ 0,00';
        if (value > 0 && value < 0.01) {
            return `€ ${value.toFixed(6).replace('.', ',')}`;
        } else if (value > 0 && value < 0.1) {
            return `€ ${value.toFixed(4).replace('.', ',')}`;
        } else {
            return window.formatCurrencyIT ? window.formatCurrencyIT(value) : `€ ${value.toFixed(2)}`;
        }
    };
    
    return `
        <tr class="product-row" data-product-id="${shipmentProduct.id}">
            <td>
                <div class="product-info">
                    <div class="product-name" style="font-weight: 500; color: #2c3e50;">${productName}</div>
                    <div class="product-sku" style="font-size: 12px; color: #7f8c8d;">SKU: ${productSku}</div>
                </div>
            </td>
            <td>${window.formatNumberIT ? window.formatNumberIT(shipmentProduct.quantity || 0) : (shipmentProduct.quantity || 0)}</td>
            <td>${formatWeight(shipmentProduct.total_weight_kg || 0)}</td>
            <td>${formatVolume(shipmentProduct.total_volume_cbm || 0)}</td>
            <td class="unit-cost-column">${formatSmallCurrency(unitCost)}</td>
            <td class="total-cost-column">${window.formatCurrencyIT ? window.formatCurrencyIT(totalCost) : `€ ${totalCost.toFixed(2)}`}</td>
            <td class="duty-rate-column">${window.formatPercentageIT ? window.formatPercentageIT(dutyRate) : `${dutyRate.toFixed(1)}%`}</td>
            <td class="duty-unit-column">${formatSmallCurrency(dutyUnitCost)}</td>
            <td class="duty-total-column">${window.formatCurrencyIT ? window.formatCurrencyIT(dutyAmount) : `€ ${dutyAmount.toFixed(2)}`}</td>
            <td class="transport-unit-column">${formatSmallCurrency(transportUnitCost)}</td>
            <td class="transport-total-column">${window.formatCurrencyIT ? window.formatCurrencyIT(transportTotal) : `€ ${transportTotal.toFixed(2)}`}</td>
            <td class="actions-column">
                <div class="action-buttons">
                    <button class="sol-btn sol-btn-secondary sol-btn-sm edit-product-btn" data-item-id="${shipmentProduct.id}" title="Modifica Prodotto">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="sol-btn sol-btn-primary sol-btn-sm product-costs-btn" data-item-id="${shipmentProduct.id}" title="Gestisci Costi">
                        <i class="fas fa-euro-sign"></i>
                    </button>
                    <button class="sol-btn sol-btn-danger sol-btn-sm delete-product-btn" data-item-id="${shipmentProduct.id}" title="Elimina Prodotto">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

async function renderDocumentsTable(documents) {
    const tbody = document.getElementById('documentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!documents || documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nessun documento caricato.</td></tr>';
        return;
    }
    
    for (const doc of documents) {
        const signedUrl = await window.dataManager.getPublicFileUrl(doc.file_path);
        const tr = document.createElement('tr');
        tr.dataset.documentId = doc.id;
        tr.innerHTML = `
            <td><a href="${signedUrl || '#'}" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt mr-2 text-primary"></i>${doc.document_name}</a></td>
            <td>${doc.document_type || '-'}</td>
            <td>${formatDate(doc.created_at)}</td>
            <td>${doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '-'}</td>
            <td>
                <button class="sol-btn sol-btn-secondary sol-btn-sm download-document-btn" title="Scarica"><i class="fas fa-download"></i></button>
                <button class="sol-btn sol-btn-primary sol-btn-sm replace-document-btn" title="Sostituisci"><i class="fas fa-exchange-alt"></i></button>
                <button class="sol-btn sol-btn-danger sol-btn-sm delete-document-btn" title="Elimina"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// 🔥 CORREZIONE: Aggiorna renderAdditionalCosts
function renderAdditionalCosts(costs) {
    const container = document.getElementById('additionalCostsList');
    if (!container) return;
    
    container.innerHTML = '';
    if (!costs || costs.length === 0) {
        container.innerHTML = '<p>Nessun costo aggiuntivo.</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Note</th>
                <th>Azioni</th>
            </tr>
        </thead>
        <tbody>
            ${costs.map(cost => `
                <tr>
                    <td>${cost.cost_type}</td>
                    <td>${formatCurrency(cost.amount)}</td>
                    <td>${cost.notes || '-'}</td>
                    <td>
                        <button class="sol-btn sol-btn-danger sol-btn-sm delete-additional-cost-btn" data-cost-id="${cost.id}" title="Elimina"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

function updateTotalCost() {
    const freightCostEl = document.getElementById('freightCost');
    const otherCostsEl = document.getElementById('otherCosts');
    const totalCostEl = document.getElementById('shipmentTotalCost');
    
    if (!freightCostEl || !otherCostsEl || !totalCostEl) return;
    
    // 🔥 CORREZIONE: Gli input HTML usano già il formato internazionale
    const freightCost = parseFloat(freightCostEl.value) || 0;
    const otherCosts = parseFloat(otherCostsEl.value) || 0;
    const totalCost = freightCost + otherCosts;
    
    // Mostra il totale in formato italiano
    totalCostEl.textContent = formatCurrency(totalCost);
}

function setupEventListeners() {
    // Event listeners per i pulsanti principali
    document.getElementById('addProductBtn')?.addEventListener('click', addProduct);
    document.getElementById('uploadDocumentBtn')?.addEventListener('click', uploadDocument);
    document.getElementById('changeCarrierBtn')?.addEventListener('click', changeShipmentCarrier);
    document.getElementById('saveCostsBtn')?.addEventListener('click', saveCosts);
    document.getElementById('addAdditionalCostBtn')?.addEventListener('click', addAdditionalCost);
    document.getElementById('editStatusBtn')?.addEventListener('click', toggleStatusEditMode);
    document.getElementById('saveStatusBtn')?.addEventListener('click', saveShipmentStatus);

    // Event listeners per i campi di input dei costi
    document.getElementById('freightCost')?.addEventListener('input', updateTotalCost);
    document.getElementById('otherCosts')?.addEventListener('input', updateTotalCost);

    // ✅ CORREZIONE: Event listener per la tabella prodotti con DEBUG
    document.getElementById('productsTableBody')?.addEventListener('click', (event) => {
        console.log('👆 Click event on products table:', {
            target: event.target.className,
            closest: event.target.closest('.product-costs-btn') ? 'COST_BUTTON' : 'OTHER'
        });

        // Gestione pulsante modifica prodotto
        const editBtn = event.target.closest('.edit-product-btn');
        if (editBtn) {
            console.log('✏️ Edit button clicked for product:', editBtn.dataset.itemId);
            editProduct(editBtn.dataset.itemId);
            return;
        }

        // ✅ CORREZIONE: Gestione pulsante costi con controllo funzione
        const costsBtn = event.target.closest('.product-costs-btn');
        if (costsBtn) {
            console.log('💰 Cost button clicked for product:', costsBtn.dataset.itemId);
            
            // Verifica che la funzione sia disponibile
            if (typeof window.editProductCosts === 'function') {
                window.editProductCosts(costsBtn.dataset.itemId);
            } else {
                console.error('❌ editProductCosts function not available!');
                window.notificationSystem?.error('Funzione costi non disponibile. Ricarica la pagina.');
            }
            return;
        }

        // Gestione pulsante elimina prodotto
        const deleteBtn = event.target.closest('.delete-product-btn');
        if (deleteBtn) {
            console.log('🗑️ Delete button clicked for product:', deleteBtn.dataset.itemId);
            deleteProduct(deleteBtn.dataset.itemId);
            return;
        }
    });

    // Event listener per la tabella documenti
    document.getElementById('documentsTableBody')?.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        
        const documentId = button.closest('tr')?.dataset.documentId;
        if (!documentId) {
            console.error('❌ Document ID not found');
            return;
        }

        // Gestione azioni documenti
        if (button.classList.contains('delete-document-btn')) {
            deleteDocument(documentId);
        } else if (button.classList.contains('replace-document-btn')) {
            replaceDocument(documentId);
        } else if (button.classList.contains('download-document-btn')) {
            downloadDocument(documentId);
        }
    });

    // ✅ NUOVO: Event listener per costi aggiuntivi (se esiste la tabella)
    document.getElementById('additionalCostsList')?.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.delete-additional-cost-btn');
        if (deleteBtn) {
            const costId = deleteBtn.dataset.costId;
            if (costId) {
                deleteAdditionalCost(costId);
            }
        }
    });

    console.log('✅ All event listeners attached successfully');
}

// 🔥 CORREZIONE: Aggiorna saveCosts - input HTML già in formato internazionale
async function saveCosts() {
    const shipmentId = getShipmentIdFromURL();
    const freightCostInput = document.getElementById('freightCost').value;
    const otherCostsInput = document.getElementById('otherCosts').value;
    
    // 🔥 CORREZIONE: Gli input HTML type="number" usano già il formato internazionale
    const freightCost = parseFloat(freightCostInput) || 0;
    const otherCosts = parseFloat(otherCostsInput) || 0;
    
    console.log('💰 Saving costs:', { freightCost, otherCosts, shipmentId });
    
    try {
        window.notificationSystem?.info('Salvataggio dei costi in corso...');
        await window.dataManager.updateShipmentCosts(shipmentId, freightCost, otherCosts);
        await window.dataManager.allocateCosts(shipmentId);
        window.notificationSystem?.success('Costi salvati con successo!');
        loadShipmentDetails(shipmentId);
    } catch (error) {
        console.error('Error saving costs:', error);
        window.notificationSystem?.error(`Errore durante il salvataggio: ${error.message}`);
    }
}

async function changeShipmentCarrier() {
    try {
        const carriers = await window.dataManager.getCarriers();
        if (!carriers || carriers.length === 0) {
            window.notificationSystem?.info('Nessun corriere disponibile.');
            return;
        }
        const modalContent = `
            <div class="sol-form">
                <div class="sol-form-group">
                    <label for="carrierSelect" class="sol-form-label">Seleziona un corriere</label>
                    <select id="carrierSelect" class="sol-form-input">
                        ${carriers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
        window.ModalSystem?.show({
            title: 'Cambia Corriere',
            content: modalContent,
            buttons: [
                { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => window.ModalSystem.close() },
                {
                    text: 'Salva',
                    class: 'sol-btn sol-btn-primary',
                    onclick: async () => {
                        const selectedCarrierId = document.getElementById('carrierSelect').value;
                        const shipmentId = getShipmentIdFromURL();
                        try {
                            window.notificationSystem?.info('Aggiornamento corriere...');
                            await window.dataManager.updateShipmentCarrier(shipmentId, selectedCarrierId);
                            window.notificationSystem?.success('Corriere aggiornato!');
                            loadShipmentDetails(shipmentId);
                            return true;
                        } catch (error) {
                            window.notificationSystem?.error(`Errore: ${error.message}`);
                            return false;
                        }
                    }
                }
            ]
        });
    } catch (error) {
        window.notificationSystem?.error('Impossibile caricare la lista dei corrieri.');
    }
}

async function uploadDocument() {
    const modalContent = `
        <div class="sol-form">
            <div class="sol-form-group">
                <label for="documentTypeInput" class="sol-form-label">Tipo di Documento</label>
                <input type="text" id="documentTypeInput" class="sol-form-input" placeholder="Es. Fattura, Bolla di carico...">
            </div>
            <div class="sol-form-group">
                <label for="fileInput" class="sol-form-label">Seleziona File</label>
                <input type="file" id="fileInput" class="sol-form-input">
            </div>
        </div>
    `;
    window.ModalSystem?.show({
        title: 'Carica Nuovo Documento',
        content: modalContent,
        buttons: [
            { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => window.ModalSystem.close() },
            {
                text: 'Carica',
                class: 'sol-btn sol-btn-primary',
                onclick: async function() {
                    const documentType = document.getElementById('documentTypeInput').value.trim();
                    const file = document.getElementById('fileInput').files[0];
                    if (!documentType || !file) {
                        window.notificationSystem?.warning('Per favore, compila tutti i campi.');
                        return false;
                    }
                    const shipmentId = getShipmentIdFromURL();
                    try {
                        window.notificationSystem?.info('Caricamento del documento in corso...');
                        await window.dataManager.uploadShipmentDocument(shipmentId, file, documentType);
                        window.notificationSystem?.success('Documento caricato con successo!');
                        loadShipmentDetails(shipmentId);
                        return true;
                    } catch (error) {
                        window.notificationSystem?.error(`Errore durante il caricamento: ${error.message}`);
                        return false;
                    }
                }
            }
        ]
    });
}

async function deleteDocument(documentId) {
    const confirmed = await window.ModalSystem?.confirm({ 
        title: 'Conferma Eliminazione', 
        content: 'Sei sicuro di voler eliminare questo documento?', 
        confirmText: 'Elimina', 
        cancelText: 'Annulla' 
    });
    if (confirmed) {
        try {
            window.notificationSystem?.info('Eliminazione in corso...');
            await window.dataManager.deleteShipmentDocument(documentId);
            window.notificationSystem?.success('Documento eliminato.');
            loadShipmentDetails(getShipmentIdFromURL());
        } catch (error) {
            window.notificationSystem?.error(`Errore: ${error.message}`);
        }
    }
}

function replaceDocument(documentId) {
    const modalContent = `
        <div class="sol-form">
            <p>Seleziona il nuovo file.</p>
            <div class="sol-form-group">
                <label for="replaceFileInput" class="sol-form-label">Nuovo File</label>
                <input type="file" id="replaceFileInput" class="sol-form-input">
            </div>
        </div>
    `;
    window.ModalSystem?.show({
        title: 'Sostituisci Documento',
        content: modalContent,
        buttons: [
            { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => window.ModalSystem.close() },
            {
                text: 'Sostituisci',
                class: 'sol-btn sol-btn-primary',
                onclick: async function() {
                    const newFile = document.getElementById('replaceFileInput').files[0];
                    if (!newFile) {
                        window.notificationSystem?.warning('Seleziona un file.');
                        return false;
                    }
                    try {
                        window.notificationSystem?.info('Sostituzione in corso...');
                        await window.dataManager.replaceShipmentDocument(documentId, newFile);
                        window.notificationSystem?.success('Documento sostituito.');
                        loadShipmentDetails(getShipmentIdFromURL());
                        return true;
                    } catch (error) {
                        window.notificationSystem?.error(`Errore: ${error.message}`);
                        return false;
                    }
                }
            }
        ]
    });
}

async function downloadDocument(documentId) {
    try {
        window.notificationSystem?.info('Preparazione del download...');
        const doc = (await window.dataManager.getShipmentDetails(getShipmentIdFromURL())).documents.find(d => d.id === documentId);
        if (!doc) throw new Error('Documento non trovato.');
        const signedUrl = await window.dataManager.getPublicFileUrl(doc.file_path);
        if (!signedUrl) throw new Error('Impossibile generare il link.');
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error(`Errore di rete: ${response.statusText}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.document_name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        window.notificationSystem?.error(`Errore durante il download: ${error.message}`);
    }
}

async function editProduct(shipmentItemId) {
    try {
        // ✅ USA I DATI GIÀ CARICATI INVECE DI RICARICARE
        if (!window.currentShipment) {
            window.notificationSystem?.error('Dati spedizione non disponibili. Ricarica la pagina.');
            return;
        }
        
        const itemToEdit = window.currentShipment.products.find(p => p.id === shipmentItemId);

        if (!itemToEdit) {
            window.notificationSystem?.error('Prodotto non trovato nella spedizione.');
            return;
        }

        const modalContent = `
            <div class="sol-form">
                <div class="sol-form-group">
                    <label for="editQuantity" class="sol-form-label">Quantità</label>
                    <input type="number" id="editQuantity" class="sol-form-input" value="${itemToEdit.quantity || 1}" min="1">
                </div>
                <div class="sol-form-group">
                    <label for="editWeight" class="sol-form-label">Peso Totale (kg)</label>
                    <input type="number" id="editWeight" class="sol-form-input" value="${(itemToEdit.total_weight_kg || 0)}" min="0" step="0.01">
                </div>
                <div class="sol-form-group">
                    <label for="editVolume" class="sol-form-label">Volume Totale (m³)</label>
                    <input type="number" id="editVolume" class="sol-form-input" value="${(itemToEdit.total_volume_cbm || 0)}" min="0" step="0.01">
                </div>
            </div>
        `;

        window.ModalSystem?.show({
            title: `Modifica Prodotto: ${itemToEdit.product?.name || itemToEdit.name || 'Prodotto'}`,
            content: modalContent,
            buttons: [
                { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => window.ModalSystem.close() },
                {
                    text: 'Salva Modifiche',
                    class: 'sol-btn sol-btn-primary',
                    onclick: async () => {
                        const quantity = parseInt(document.getElementById('editQuantity').value, 10);
                        const totalWeight = parseFloat(document.getElementById('editWeight').value) || 0;
                        const totalVolume = parseFloat(document.getElementById('editVolume').value) || 0;

                        if (isNaN(quantity) || quantity <= 0) {
                            window.notificationSystem?.error('La quantità deve essere un numero valido maggiore di zero.');
                            return false;
                        }

                        const updatedData = {
                            quantity: quantity,
                            weight_kg: quantity > 0 ? totalWeight / quantity : 0,
                            volume_cbm: quantity > 0 ? totalVolume / quantity : 0,
                        };

                        try {
                            window.notificationSystem?.info('Salvataggio modifiche...');
                            await window.dataManager.updateShipmentItem(shipmentItemId, updatedData);
                            await window.dataManager.allocateCosts(getShipmentIdFromURL());
                            window.notificationSystem?.success('Prodotto aggiornato con successo!');
                            loadShipmentDetails(getShipmentIdFromURL());
                            return true;
                        } catch (error) {
                            window.notificationSystem?.error(`Errore durante l'aggiornamento: ${error.message}`);
                            return false;
                        }
                    }
                }
            ]
        });

    } catch (error) {
        console.error('Error editing product:', error);
        window.notificationSystem?.error('Impossibile caricare i dettagli del prodotto da modificare.');
    }
}

async function deleteProduct(productId) {
    const confirmed = await window.ModalSystem?.confirm({ 
        title: 'Conferma Eliminazione', 
        content: 'Sei sicuro di voler rimuovere questo prodotto?', 
        confirmText: 'Elimina', 
        cancelText: 'Annulla' 
    });
    if (confirmed) {
        try {
            await window.dataManager.deleteShipmentItem(productId);
            window.notificationSystem?.success('Prodotto rimosso.');
            loadShipmentDetails(getShipmentIdFromURL());
        } catch (error) {
            window.notificationSystem?.error('Errore durante la rimozione del prodotto.');
        }
    }
}

async function editProductCosts(productId) {
    const shipmentId = getShipmentIdFromURL();
    
    try {
        // ✅ USA I DATI GIÀ CARICATI INVECE DI RICARICARE
        if (!window.currentShipment) {
            window.notificationSystem?.error('Dati spedizione non disponibili. Ricarica la pagina.');
            return;
        }
        
        const product = window.currentShipment.products.find(p => p.id === productId);
        
        if (!product) {
            window.notificationSystem?.error('Prodotto non trovato nella spedizione.');
            return;
        }
        
        // ✅ CARICA I VALORI ESISTENTI DAI CAMPI SALVATI O DAI METADATI
        const existingUnitCost = product.unit_cost || product.cost_metadata?.unitCost || 0;
        const existingTotalCost = product.total_cost || product.cost_metadata?.totalCost || 0;
        const existingDutyRate = product.duty_rate || product.cost_metadata?.dutyRate || 0;
        const existingCustomsFees = product.customs_fees || product.cost_metadata?.customsFees || 0;
        
        console.log('💰 Loading existing costs for product:', {
            productId,
            existingUnitCost,
            existingTotalCost,
            existingDutyRate,
            existingCustomsFees
        });
        
        // ✅ ESTENDI LA MODAL ESISTENTE CON SEZIONE COSTI
        const modalContent = `
            <div class="product-selection-modal">
                <!-- ✅ HEADER INFORMATIVO DEL PRODOTTO -->
                <div class="product-header" style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <div class="product-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div class="info-item">
                            <div style="font-size: 12px; font-weight: 600; color: #6c757d; text-transform: uppercase; margin-bottom: 5px;">Cod. Prodotto</div>
                            <div style="font-size: 14px; font-weight: 500; color: #212529; padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 4px;">${product.product?.sku || product.sku || '-'}</div>
                        </div>
                        <div class="info-item">
                            <div style="font-size: 12px; font-weight: 600; color: #6c757d; text-transform: uppercase; margin-bottom: 5px;">Descrizione</div>
                            <div style="font-size: 14px; font-weight: 500; color: #212529; padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 4px;">${product.product?.name || product.name || 'Prodotto senza nome'}</div>
                        </div>
                        <div class="info-item">
                            <div style="font-size: 12px; font-weight: 600; color: #6c757d; text-transform: uppercase; margin-bottom: 5px;">Peso Totale</div>
                            <div style="font-size: 14px; font-weight: 500; color: #212529; padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 4px;">${formatWeight(product.total_weight_kg || 0)}</div>
                        </div>
                        <div class="info-item">
                            <div style="font-size: 12px; font-weight: 600; color: #6c757d; text-transform: uppercase; margin-bottom: 5px;">Volume Totale</div>
                            <div style="font-size: 14px; font-weight: 500; color: #212529; padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 4px;">${formatVolume(product.total_volume_cbm || 0)}</div>
                        </div>
                        <div class="info-item">
                            <div style="font-size: 12px; font-weight: 600; color: #6c757d; text-transform: uppercase; margin-bottom: 5px;">Quantità</div>
                            <div style="font-size: 14px; font-weight: 500; color: #212529; padding: 8px 12px; background: white; border: 1px solid #dee2e6; border-radius: 4px;">${formatQuantity(product.quantity || 0)}</div>
                        </div>
                    </div>
                </div>
                
                <!-- ✅ SEZIONI COSTI INTEGRATE -->
                <div class="sol-form">
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-euro-sign"></i> Costo Unitario (€)</label>
                        <input type="number" 
                               id="unitCost" 
                               class="sol-form-input"
                               step="0.01" 
                               value="${existingUnitCost}"
                               placeholder="es: 25.50">
                        <small class="form-text text-muted">Costo di acquisto/produzione per unità</small>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-calculator"></i> Costo Totale (€)</label>
                        <input type="number" 
                               id="totalCost" 
                               class="sol-form-input"
                               step="0.01" 
                               value="${existingTotalCost}"
                               placeholder="Auto-calcolato o inserimento manuale">
                        <small class="form-text text-muted">Verrà calcolato automaticamente se lasciato vuoto</small>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-ship"></i> Aliquota Dazio (%)</label>
                        <input type="number" 
                               id="dutyRate" 
                               class="sol-form-input"
                               step="0.1" 
                               min="0" 
                               max="100"
                               value="${existingDutyRate}"
                               placeholder="es: 8.5">
                        <small class="form-text text-muted">Percentuale di dazio per questo prodotto</small>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-file-invoice-dollar"></i> Altri Oneri Doganali (€)</label>
                        <input type="number" 
                               id="customsFees" 
                               class="sol-form-input"
                               step="0.01" 
                               value="${existingCustomsFees}"
                               placeholder="es: 50.00">
                        <small class="form-text text-muted">Spese fisse: clearance, handling, etc.</small>
                    </div>
                </div>
                
                <!-- ✅ ANTEPRIMA CALCOLI -->
                <div style="margin-top: 20px; padding: 15px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h6 style="color: #495057; margin-bottom: 10px;"><i class="fas fa-calculator" style="margin-right: 8px; color: #28a745;"></i>Anteprima Calcoli</h6>
                    <div id="costsCalculation" class="calculation-preview">
                        <!-- Will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        `;
        
        window.ModalSystem?.show({
            title: `💰 Gestione Costi - ${product.product?.name || product.name || 'Prodotto'}`,
            content: modalContent,
            size: 'lg',
            buttons: [
                {
                    text: 'Annulla',
                    class: 'sol-btn sol-btn-secondary',
                    onclick: () => window.ModalSystem.close()
                },
                {
                    text: 'Salva Costi',
                    class: 'sol-btn sol-btn-primary',
                    onclick: () => saveProductCosts(productId)
                }
            ]
        });
        
        // Setup real-time calculation
        setTimeout(() => setupCostCalculation(product), 100);
        
    } catch (error) {
        console.error('Error loading product for cost editing:', error);
        window.notificationSystem?.error('Errore nel caricamento del prodotto.');
    }
}

// ✅ AGGIUNGI QUESTA FUNZIONE
function setupCostCalculation(product) {
    const inputs = ['unitCost', 'totalCost', 'dutyRate', 'customsFees'];
    const quantity = product.quantity || 0;
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', () => {
                updateCostCalculation(quantity);
            });
        }
    });
    
    // Initial calculation
    updateCostCalculation(quantity);
}

// ✅ AGGIUNGI QUESTA FUNZIONE
function updateCostCalculation(quantity) {
    const unitCost = parseFloat(document.getElementById('unitCost')?.value || 0);
    const manualTotalCost = parseFloat(document.getElementById('totalCost')?.value || 0);
    const dutyRate = parseFloat(document.getElementById('dutyRate')?.value || 0);
    const customsFees = parseFloat(document.getElementById('customsFees')?.value || 0);
    
    // Calculate totals
    const calculatedTotalCost = unitCost * quantity;
    const actualTotalCost = manualTotalCost || calculatedTotalCost;
    const dutyAmount = actualTotalCost * dutyRate / 100;
    const grandTotal = actualTotalCost + dutyAmount + customsFees;
    
    const previewContainer = document.getElementById('costsCalculation');
    if (previewContainer) {
        previewContainer.innerHTML = `
            <div class="calc-row">
                <span>Quantità:</span>
                <strong>${quantity}</strong>
            </div>
            <div class="calc-row">
                <span>Costo totale:</span>
                <strong>€${actualTotalCost.toFixed(2)}</strong>
                ${manualTotalCost ? '<small>(manuale)</small>' : '<small>(calcolato)</small>'}
            </div>
            <div class="calc-row duty">
                <span>Dazio (${dutyRate}%):</span>
                <strong>€${dutyAmount.toFixed(2)}</strong>
            </div>
            <div class="calc-row">
                <span>Altri oneri:</span>
                <strong>€${customsFees.toFixed(2)}</strong>
            </div>
            <div class="calc-row total">
                <span><strong>Totale prodotto:</strong></span>
                <strong>€${grandTotal.toFixed(2)}</strong>
            </div>
        `;
    }
}

// ✅ AGGIUNGI QUESTA FUNZIONE

async function saveProductCosts(productId) {
    const unitCost = parseFloat(document.getElementById('unitCost')?.value || 0);
    const manualTotalCost = parseFloat(document.getElementById('totalCost')?.value || 0);
    const dutyRate = parseFloat(document.getElementById('dutyRate')?.value || 0);
    const customsFees = parseFloat(document.getElementById('customsFees')?.value || 0);
    
    const shipmentId = getShipmentIdFromURL();
    
    try {
        const shipmentDetails = await window.dataManager.getShipmentDetails(shipmentId);
        const product = shipmentDetails.products.find(p => p.id === productId);
        
        if (!product) {
            window.notificationSystem?.error('Prodotto non trovato.');
            return false;
        }
        
        const quantity = product.quantity || 0;
        const calculatedTotalCost = unitCost * quantity;
        const actualTotalCost = manualTotalCost || calculatedTotalCost;
        const dutyAmount = actualTotalCost * (dutyRate / 100);
        
        // ✅ CORREZIONE: Calcola anche il dazio unitario
        const dutyUnitCost = quantity > 0 ? dutyAmount / quantity : 0;
        
        // ✅ CORREZIONE: Prepara TUTTI i dati da salvare inclusi i costi
        const updatedData = {
            // Campi esistenti
            quantity: product.quantity,
            weight_kg: product.weight_kg,
            volume_cbm: product.volume_cbm,
            
            // ✅ AGGIUNGI: Salva i costi direttamente nei campi della tabella
            unit_cost: unitCost,
            total_cost: actualTotalCost,
            duty_rate: dutyRate,
            duty_amount: dutyAmount,
            duty_unit_cost: dutyUnitCost, // ✅ NUOVO CAMPO
            customs_fees: customsFees,
            
            // Metadati per compatibilità con il rendering
            cost_metadata: {
                unitCost: unitCost,
                totalCost: actualTotalCost,
                dutyRate: dutyRate,
                dutyAmount: dutyAmount,
                dutyUnitCost: dutyUnitCost, // ✅ NUOVO CAMPO
                customsFees: customsFees,
                grandTotal: actualTotalCost + dutyAmount + customsFees
            }
        };
        
        console.log('💰 Saving product costs with all fields:', updatedData);
        
        window.notificationSystem?.info('Salvataggio costi prodotto...');
        
        // Salva usando il dataManager esistente
        await window.dataManager.updateShipmentItem(productId, updatedData);
        
        window.ModalSystem.close();
        window.notificationSystem?.success('Costi prodotto aggiornati!');
        
        // Refresh della pagina
        await loadShipmentDetails(shipmentId);
        
        return true;
        
    } catch (error) {
        console.error('Error saving product costs:', error);
        window.notificationSystem?.error(`Errore durante il salvataggio: ${error.message}`);
        return false;
    }
}

async function addProduct() {
    try {
        const allProducts = await window.dataManager.getAllProducts();
        
        // ✅ MODAL FULLSCREEN CON LAYOUT A DUE COLONNE
        const modalContent = `
            <div class="product-selection-modal">
                <!-- ✅ SEZIONE RICERCA -->
                <div class="search-section">
                    <input type="text" id="productSearchInput" class="sol-form-input search-input" placeholder="🔍 Cerca per nome, SKU...">
                </div>
                
                <!-- ✅ LISTA PRODOTTI CON LAYOUT A DUE COLONNE -->
                <div id="productListContainer" class="product-cards-container">
                    ${allProducts.map(product => `
                        <div class="product-card-two-column" data-product-id="${product.id}">
                            <!-- COLONNA SINISTRA: DESCRIZIONE -->
                            <div class="product-left-column">
                                <div class="product-checkbox-wrapper">
                                    <input type="checkbox" class="product-checkbox" id="product-check-${product.id}">
                                </div>
                                <div class="product-description">
                                    <div class="product-name">${product.name}</div>
                                    <div class="product-sku">SKU: ${product.sku || 'N/A'}</div>
                                </div>
                            </div>
                            
                            <!-- COLONNA DESTRA: CAMPI INPUT IN RIGHE -->
                            <div class="product-right-column">
                                <!-- RIGA 1: Quantità, Peso, Volume -->
                                <div class="input-row">
                                    <div class="input-field">
                                        <label>Quantità</label>
                                        <input type="number" class="product-quantity-input" placeholder="1" min="1" value="1">
                                    </div>
                                    <div class="input-field">
                                        <label>Peso Tot. (kg)</label>
                                        <input type="number" class="product-weight-input" placeholder="0.00" min="0" step="0.01">
                                    </div>
                                    <div class="input-field">
                                        <label>Volume Tot. (m³)</label>
                                        <input type="number" class="product-volume-input" placeholder="0.00" min="0" step="0.01">
                                    </div>
                                </div>
                                
                                <!-- RIGA 2: Costo Unitario, Aliquota Dazio, Altri Oneri -->
                                <div class="input-row">
                                    <div class="input-field">
                                        <label>Costo Unitario (€)</label>
                                        <input type="number" class="product-unit-cost-input" placeholder="0.00" step="0.01">
                                    </div>
                                    <div class="input-field">
                                        <label>Aliquota Dazio (%)</label>
                                        <input type="number" class="product-duty-rate-input" placeholder="0.0" step="0.1" min="0" max="100">
                                    </div>
                                    <div class="input-field">
                                        <label>Altri Oneri (€)</label>
                                        <input type="number" class="product-custom-fees-input" placeholder="0.00" step="0.01">
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- ✅ SEZIONE COSTI GLOBALI -->
                <div class="global-costs-section">
                    <h6><i class="fas fa-ship"></i> Costi Doganali Globali</h6>
                    <div class="global-costs-grid">
                        <div class="input-group">
                            <label>Altri Oneri Doganali (€)</label>
                            <input type="number" id="globalCustomsFees" class="sol-form-input" step="0.01" placeholder="0.00">
                            <small>Spese fisse distribuite tra tutti i prodotti</small>
                        </div>
                        <div class="input-group">
                            <label>Note Costi</label>
                            <input type="text" id="costsNotes" class="sol-form-input" placeholder="Note aggiuntive">
                        </div>
                    </div>
                </div>
                
                <!-- ✅ ANTEPRIMA TOTALI -->
                <div id="costsPreview" class="costs-preview-section" style="display: none;">
                    <h6><i class="fas fa-calculator"></i> Anteprima Totali</h6>
                    <div id="totalCalculation"></div>
                </div>
            </div>
        `;
        
        window.ModalSystem?.show({
            title: '📦 Aggiungi Prodotti alla Spedizione',
            content: modalContent,
            size: 'xxl', // ✅ MODAL FULLSCREEN
            buttons: [
                {
                    text: 'Annulla',
                    class: 'sol-btn sol-btn-secondary',
                    onclick: () => window.ModalSystem.close()
                },
                {
                    text: 'Aggiungi Prodotti Selezionati',
                    class: 'sol-btn sol-btn-primary',
                    onclick: () => addSelectedProductsWithCosts()
                }
            ]
        });
        
        // ✅ SETUP EVENT LISTENERS
        setTimeout(() => {
            setupProductSelectionWithCosts();
        }, 100);
        
    } catch (error) {
        console.error('Error loading products:', error);
        window.notificationSystem?.error('Errore nel caricamento dei prodotti.');
    }
}

// ✅ SETUP EVENT LISTENERS PER LA MODAL
function setupProductSelectionWithCosts() {
    const searchInput = document.getElementById('productSearchInput');
    const productRows = document.querySelectorAll('.product-card-two-column[data-product-id]');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    const costInputs = document.querySelectorAll('.product-unit-cost-input, .product-duty-rate-input, .product-quantity-input, .product-weight-input, .product-volume-input, .product-custom-fees-input');
    
    console.log('🔧 setupProductSelectionWithCosts:', {
        searchInput: !!searchInput,
        productRows: productRows.length,
        checkboxes: checkboxes.length,
        costInputs: costInputs.length
    });
    
    // ✅ RICERCA PRODOTTI
    if (searchInput && productRows.length > 0) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            productRows.forEach(row => {
                const nameEl = row.querySelector('.product-name');
                const skuEl = row.querySelector('.product-sku');
                
                if (nameEl && skuEl) {
                    const name = nameEl.textContent.toLowerCase();
                    const sku = skuEl.textContent.toLowerCase();
                    const visible = name.includes(searchTerm) || sku.includes(searchTerm);
                    row.style.display = visible ? 'flex' : 'none';
                }
            });
        });
    }
    
    // ✅ VALIDAZIONE IN TEMPO REALE DEI LIMITI
    const weightVolumeInputs = document.querySelectorAll('.product-weight-input, .product-volume-input');
    weightVolumeInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', async (e) => {
                const row = e.target.closest('.product-card-two-column');
                const checkbox = row?.querySelector('.product-checkbox');
                
                // Auto-check se l'utente inserisce valori
                if (e.target.value && checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                }
                
                // ✅ VALIDAZIONE LIMITI IN TEMPO REALE
                await validateSelectedProductsLimits();
                updateCostsPreview();
            });
        }
    });
    
    // ✅ AUTO-CHECK PER ALTRI INPUT
    const otherInputs = document.querySelectorAll('.product-unit-cost-input, .product-duty-rate-input, .product-quantity-input, .product-custom-fees-input');
    otherInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', (e) => {
                const row = e.target.closest('.product-card-two-column');
                const checkbox = row?.querySelector('.product-checkbox');
                
                if (e.target.value && checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    updateCostsPreview();
                } else if (e.target.value) {
                    updateCostsPreview();
                }
            });
        }
    });
    
    // ✅ UPDATE PREVIEW E VALIDAZIONE AL CAMBIO CHECKBOX
    checkboxes.forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', async () => {
                await validateSelectedProductsLimits();
                updateCostsPreview();
            });
        }
    });
    
    // ✅ UPDATE GLOBAL COSTS
    const globalInputs = document.querySelectorAll('#globalCustomsFees, #costsNotes');
    globalInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', updateCostsPreview);
        }
    });
    
    console.log('✅ Product selection event listeners attached safely');
}

// ✅ ANTEPRIMA COSTI CON CONTROLLI SICUREZZA
function updateCostsPreview() {
    const selectedRows = document.querySelectorAll('.product-checkbox:checked');
    const previewDiv = document.getElementById('costsPreview');
    const calculationDiv = document.getElementById('totalCalculation');
    
    if (!previewDiv || !calculationDiv) {
        console.warn('⚠️ Preview elements not found');
        return;
    }
    
    if (selectedRows.length === 0) {
        previewDiv.style.display = 'none';
        return;
    }
    
    let totalProducts = 0;
    let totalUnitCost = 0;
    let totalDuty = 0;
    let totalQuantity = 0;
    let totalCustomsFees = 0;
    
    selectedRows.forEach(checkbox => {
        if (!checkbox) return;
        
        const row = checkbox.closest('.product-card-two-column');
        if (!row) {
            console.warn('⚠️ Row not found for checkbox');
            return;
        }
        
        // ✅ CONTROLLI SICUREZZA PER OGNI INPUT
        const quantityInput = row.querySelector('.product-quantity-input');
        const unitCostInput = row.querySelector('.product-unit-cost-input');
        const dutyRateInput = row.querySelector('.product-duty-rate-input');
        const customsFeesInput = row.querySelector('.product-custom-fees-input');
        
        const quantity = quantityInput ? parseFloat(quantityInput.value) || 1 : 1;
        const unitCost = unitCostInput ? parseFloat(unitCostInput.value) || 0 : 0;
        const dutyRate = dutyRateInput ? parseFloat(dutyRateInput.value) || 0 : 0;
        const customsFees = customsFeesInput ? parseFloat(customsFeesInput.value) || 0 : 0;
        
        const productTotal = quantity * unitCost;
        const productDuty = productTotal * (dutyRate / 100);
        
        totalProducts++;
        totalQuantity += quantity;
        totalUnitCost += productTotal;
        totalDuty += productDuty;
        totalCustomsFees += customsFees;
    });
    
    const globalCustomsFeesInput = document.getElementById('globalCustomsFees');
    const globalCustomsFees = globalCustomsFeesInput ? parseFloat(globalCustomsFeesInput.value) || 0 : 0;
    const grandTotal = totalUnitCost + totalDuty + totalCustomsFees + globalCustomsFees;
    
    calculationDiv.innerHTML = `
        <div class="calc-row">
            <span>Prodotti selezionati:</span>
            <span><strong>${totalProducts}</strong></span>
        </div>
        <div class="calc-row">
            <span>Quantità totale:</span>
            <span><strong>${window.formatNumberIT ? window.formatNumberIT(totalQuantity) : totalQuantity}</strong></span>
        </div>
        <div class="calc-row">
            <span>Costo prodotti:</span>
            <span><strong>${window.formatCurrencyIT ? window.formatCurrencyIT(totalUnitCost) : `€ ${totalUnitCost.toFixed(2)}`}</strong></span>
        </div>
        <div class="calc-row duty">
            <span>Dazi stimati:</span>
            <span><strong>${window.formatCurrencyIT ? window.formatCurrencyIT(totalDuty) : `€ ${totalDuty.toFixed(2)}`}</strong></span>
        </div>
        <div class="calc-row">
            <span>Oneri prodotti:</span>
            <span><strong>${window.formatCurrencyIT ? window.formatCurrencyIT(totalCustomsFees) : `€ ${totalCustomsFees.toFixed(2)}`}</strong></span>
        </div>
        <div class="calc-row">
            <span>Altri oneri doganali:</span>
            <span><strong>${window.formatCurrencyIT ? window.formatCurrencyIT(globalCustomsFees) : `€ ${globalCustomsFees.toFixed(2)}`}</strong></span>
        </div>
        <div class="calc-row total">
            <span>Totale stimato:</span>
            <span><strong>${window.formatCurrencyIT ? window.formatCurrencyIT(grandTotal) : `€ ${grandTotal.toFixed(2)}`}</strong></span>
        </div>
    `;
    
    previewDiv.style.display = 'block';
}

// ✅ AGGIUNGI PRODOTTI CON CONTROLLI SICUREZZA

async function addSelectedProductsWithCosts() {
    const selectedProducts = [];
    const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        window.notificationSystem?.warning('Seleziona almeno un prodotto.');
        return;
    }
    
    // ✅ CALCOLA TOTALI PER VALIDAZIONE CONTAINER
    let totalWeightToAdd = 0;
    let totalVolumeToAdd = 0;
    
    selectedCheckboxes.forEach(checkbox => {
        if (!checkbox) return;
        
        const row = checkbox.closest('.product-card-two-column');
        if (!row) return;
        
        const weightInput = row.querySelector('.product-weight-input');
        const volumeInput = row.querySelector('.product-volume-input');
        
        const weight = weightInput ? parseFloat(weightInput.value) || 0 : 0;
        const volume = volumeInput ? parseFloat(volumeInput.value) || 0 : 0;
        
        totalWeightToAdd += weight;
        totalVolumeToAdd += volume;
    });
    
    // ✅ VALIDAZIONE LIMITI CONTAINER
    const shipmentId = getShipmentIdFromURL();
    const validationResult = await validateContainerLimits(shipmentId, totalWeightToAdd, totalVolumeToAdd);
    
    if (!validationResult.valid) {
        window.notificationSystem?.error(validationResult.message);
        return;
    }
    
    // ✅ PROCESSA I PRODOTTI SELEZIONATI
    for (const checkbox of selectedCheckboxes) {
        if (!checkbox) continue;
        
        const row = checkbox.closest('.product-card-two-column');
        if (!row) continue;
        
        const productId = row.dataset.productId;
        if (!productId) continue;
                
        // ✅ FETCH COMPLETO DEL PRODOTTO PER AVERE NOME E SKU
        let productDetails = null;
        try {
            console.log('🔍 Fetching product details for:', productId);
            
                const { data, error } = await window.supabase
                .from('products')
                .select('id, name:description, sku')  // ✅ MAPPA description -> name
                .eq('id', productId)
                .eq('organization_id', window.dataManager?.organizationId)
                .single();
            
            if (!error && data) {
                productDetails = data;
                console.log('✅ Product details fetched:', productDetails);
            } else {
                console.warn('⚠️ Product fetch error:', error);
            }
        } catch (error) {
            console.warn('⚠️ Could not fetch product details:', error);
        }
        
        // ✅ RACCOGLI TUTTI I DATI
        const weightInput = row.querySelector('.product-weight-input');
        const volumeInput = row.querySelector('.product-volume-input');
        const quantityInput = row.querySelector('.product-quantity-input');
        const unitCostInput = row.querySelector('.product-unit-cost-input');
        const dutyRateInput = row.querySelector('.product-duty-rate-input');
        const customsFeesInput = row.querySelector('.product-custom-fees-input');
        
        const weight = weightInput ? parseFloat(weightInput.value) || 0 : 0;
        const volume = volumeInput ? parseFloat(volumeInput.value) || 0 : 0;
        const quantity = quantityInput ? parseFloat(quantityInput.value) || 1 : 1;
        const unitCost = unitCostInput ? parseFloat(unitCostInput.value) || 0 : 0;
        const dutyRate = dutyRateInput ? parseFloat(dutyRateInput.value) || 0 : 0;
        const customsFees = customsFeesInput ? parseFloat(customsFeesInput.value) || 0 : 0;
        
        const totalCost = quantity * unitCost;
        const dutyAmount = totalCost * (dutyRate / 100);
        const dutyUnitCost = quantity > 0 ? dutyAmount / quantity : 0;
        
        // ✅ CREA L'OGGETTO PRODOTTO CON TUTTI I CAMPI
        const productData = {
            product_id: productId,
            quantity: quantity,
            weight_kg: quantity > 0 ? weight / quantity : 0,
            volume_cbm: quantity > 0 ? volume / quantity : 0,
            total_weight_kg: weight,
            total_volume_cbm: volume,
            
            // ✅ CAMPI COSTI - SALVATI DIRETTAMENTE NELLA TABELLA
            unit_cost: unitCost,
            total_cost: totalCost,
            duty_rate: dutyRate,
            duty_amount: dutyAmount,
            duty_unit_cost: dutyUnitCost,
            customs_fees: customsFees,
            
            // ✅ AGGIUNGI INFO PRODOTTO PER IL RENDERING
            name: productDetails?.name || 'Prodotto senza nome',
            sku: productDetails?.sku || 'N/A'
        };
        
        console.log('💰 Adding product with all cost fields:', productData);
        selectedProducts.push(productData);
    }
    
    if (selectedProducts.length === 0) {
        window.notificationSystem?.warning('Nessun prodotto valido selezionato.');
        return;
    }
    
    // ✅ GESTIONE COSTI GLOBALI
    const globalCustomsFeesInput = document.getElementById('globalCustomsFees');
    const globalCustomsFees = globalCustomsFeesInput ? parseFloat(globalCustomsFeesInput.value) || 0 : 0;
    
    if (globalCustomsFees > 0) {
        const feePerProduct = globalCustomsFees / selectedProducts.length;
        selectedProducts.forEach(product => {
            product.customs_fees += feePerProduct;
        });
    }
    
    try {
    window.notificationSystem?.info(`Aggiunta di ${selectedProducts.length} prodotti in corso...`);
    
    // ✅ AGGIUNGI OGNI PRODOTTO CON DEBUG DETTAGLIATO
    for (const productData of selectedProducts) {
        console.log('📦 About to add product:', {
            product_id: productData.product_id,
            quantity: productData.quantity,
            unit_cost: productData.unit_cost,
            total_cost: productData.total_cost,
            duty_rate: productData.duty_rate,
            duty_amount: productData.duty_amount,
            duty_unit_cost: productData.duty_unit_cost,
            customs_fees: productData.customs_fees
        });
        
        const result = await window.dataManager.addShipmentItem(shipmentId, productData);
        console.log('✅ Product added, result:', result);
    }
    
    window.notificationSystem?.success(`${selectedProducts.length} prodotti aggiunti con successo!`);
    window.ModalSystem?.close();
    
    await loadShipmentDetails(shipmentId);
    
} catch (error) {
    console.error('❌ Detailed error adding products:', error);
    window.notificationSystem?.error(`Errore nell'aggiunta dei prodotti: ${error.message}`);
}
}

async function validateContainerLimits(shipmentId, additionalWeight, additionalVolume) {
    try {
        // ✅ CARICA I DATI DELLA SPEDIZIONE CORRENTE
        const shipmentDetails = await window.dataManager.getShipmentDetails(shipmentId);
        
        if (!shipmentDetails) {
            return { valid: false, message: 'Impossibile caricare i dati della spedizione.' };
        }
        
        // ✅ CALCOLA PESO E VOLUME ATTUALI
        const currentWeight = shipmentDetails.products?.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0) || 0;
        const currentVolume = shipmentDetails.products?.reduce((sum, p) => sum + (p.total_volume_cbm || 0), 0) || 0;
        
        const totalWeightAfter = currentWeight + additionalWeight;
        const totalVolumeAfter = currentVolume + additionalVolume;
        
        console.log('🔍 Container validation:', {
            currentWeight: currentWeight.toFixed(3),
            additionalWeight: additionalWeight.toFixed(3),
            totalWeightAfter: totalWeightAfter.toFixed(3),
            currentVolume: currentVolume.toFixed(3),
            additionalVolume: additionalVolume.toFixed(3),
            totalVolumeAfter: totalVolumeAfter.toFixed(3)
        });
        
        // ✅ DETERMINA LA CAPACITÀ MASSIMA DAI CONTAINER
        const containerInfo = getContainerCapacity(shipmentDetails);
        
        if (containerInfo.maxWeight > 0 && totalWeightAfter > containerInfo.maxWeight) {
            return {
                valid: false,
                message: `⚠️ LIMITE PESO SUPERATO!\n\nPeso attuale: ${formatWeight(currentWeight)}\nPeso da aggiungere: ${formatWeight(additionalWeight)}\nTotale: ${formatWeight(totalWeightAfter)}\n\nCapacità massima container: ${formatWeight(containerInfo.maxWeight)}\nEccedenza: ${formatWeight(totalWeightAfter - containerInfo.maxWeight)}`
            };
        }
        
        if (containerInfo.maxVolume > 0 && totalVolumeAfter > containerInfo.maxVolume) {
            return {
                valid: false,
                message: `⚠️ LIMITE VOLUME SUPERATO!\n\nVolume attuale: ${formatVolume(currentVolume)}\nVolume da aggiungere: ${formatVolume(additionalVolume)}\nTotale: ${formatVolume(totalVolumeAfter)}\n\nCapacità massima container: ${formatVolume(containerInfo.maxVolume)}\nEccedenza: ${formatVolume(totalVolumeAfter - containerInfo.maxVolume)}`
            };
        }
        
        // ✅ AVVISO SE SI SUPERA L'80% DELLA CAPACITÀ
        const weightPercent = containerInfo.maxWeight > 0 ? (totalWeightAfter / containerInfo.maxWeight) * 100 : 0;
        const volumePercent = containerInfo.maxVolume > 0 ? (totalVolumeAfter / containerInfo.maxVolume) * 100 : 0;
        
        let warnings = [];
        if (weightPercent > 80) {
            warnings.push(`Peso al ${weightPercent.toFixed(1)}% della capacità`);
        }
        if (volumePercent > 80) {
            warnings.push(`Volume al ${volumePercent.toFixed(1)}% della capacità`);
        }
        
        if (warnings.length > 0) {
            // Non blocca ma avvisa
            const proceed = await window.ModalSystem?.confirm({
                title: '⚠️ Attenzione - Capacità Elevata',
                content: `${warnings.join('\n')}\n\nVuoi continuare?`,
                confirmText: 'Continua',
                cancelText: 'Annulla'
            });
            
            if (!proceed) {
                return { valid: false, message: 'Operazione annullata dall\'utente.' };
            }
        }
        
        return { valid: true };
        
    } catch (error) {
        console.error('Error in container validation:', error);
        return { valid: true }; // In caso di errore, non bloccare
    }
}

function getContainerCapacity(shipmentDetails) {
    // ✅ CAPACITÀ STANDARD CONTAINER (in kg e m³)
    const CONTAINER_CAPACITIES = {
        "20'": { weight: 28080, volume: 33.2 },
        "40'": { weight: 26580, volume: 67.7 },
        "40'HC": { weight: 26380, volume: 76.4 },
        "45'HC": { weight: 26500, volume: 86.0 }
    };
    
    let maxWeight = 0;
    let maxVolume = 0;
    
    // ✅ CERCA INFO CONTAINER DAL TRACKING
    const containers = shipmentDetails.tracking?.metadata?.raw?.shipment?.containers;
    
    if (Array.isArray(containers) && containers.length > 0) {
        containers.forEach(container => {
            const size = container.size || 0;
            const type = (container.type || '').toUpperCase();
            let containerType = null;
            
            if (size === 20) containerType = "20'";
            else if (size === 40) containerType = (type.includes('HC') || type.includes('HQ')) ? "40'HC" : "40'";
            else if (size === 45) containerType = "45'HC";
            
            if (containerType && CONTAINER_CAPACITIES[containerType]) {
                maxWeight += CONTAINER_CAPACITIES[containerType].weight;
                maxVolume += CONTAINER_CAPACITIES[containerType].volume;
            }
        });
    } else {
        // ✅ FALLBACK: Analizza il campo container_types della spedizione
        const containerTypes = shipmentDetails.tracking?.container_types || 
                              shipmentDetails.container_types || 
                              document.getElementById('shipmentContainerTypes')?.textContent || '';
        
        if (containerTypes && containerTypes !== '-') {
            const parts = containerTypes.split(',');
            parts.forEach(part => {
                const match = part.trim().match(/(\d+)x(.+)/);
                if (match) {
                    const count = parseInt(match[1], 10);
                    const type = match[2].trim();
                    const capacity = CONTAINER_CAPACITIES[type];
                    if (capacity) {
                        maxWeight += count * capacity.weight;
                        maxVolume += count * capacity.volume;
                    }
                }
            });
        }
    }
    
    console.log('📦 Container capacity calculated:', {
        maxWeight: maxWeight.toFixed(0),
        maxVolume: maxVolume.toFixed(1),
        source: containers ? 'tracking_containers' : 'container_types'
    });
    
    return { maxWeight, maxVolume };
}

async function validateSelectedProductsLimits() {
    const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        // Rimuovi eventuali warning precedenti
        removeContainerWarnings();
        return;
    }
    
    let totalWeight = 0;
    let totalVolume = 0;
    
    selectedCheckboxes.forEach(checkbox => {
        const row = checkbox.closest('.product-card-two-column');
        if (!row) return;
        
        const weightInput = row.querySelector('.product-weight-input');
        const volumeInput = row.querySelector('.product-volume-input');
        
        const weight = weightInput ? parseFloat(weightInput.value) || 0 : 0;
        const volume = volumeInput ? parseFloat(volumeInput.value) || 0 : 0;
        
        totalWeight += weight;
        totalVolume += volume;
    });
    
    const shipmentId = getShipmentIdFromURL();
    const validationResult = await validateContainerLimits(shipmentId, totalWeight, totalVolume);
    
    if (!validationResult.valid) {
        showContainerWarning(validationResult.message);
    } else {
        removeContainerWarnings();
    }
}

function showContainerWarning(message) {
    removeContainerWarnings(); // Rimuovi warnings precedenti
    
    const warningDiv = document.createElement('div');
    warningDiv.id = 'containerLimitWarning';
    warningDiv.className = 'alert alert-warning';
    warningDiv.style.cssText = 'margin: 10px 0; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404;';
    warningDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
        <strong>Attenzione Limiti Container:</strong><br>
        ${message.replace(/\n/g, '<br>')}
    `;
    
    const modalContent = document.querySelector('.product-selection-modal');
    if (modalContent) {
        modalContent.insertBefore(warningDiv, modalContent.firstChild);
    }
}

function removeContainerWarnings() {
    const existingWarning = document.getElementById('containerLimitWarning');
    if (existingWarning) {
        existingWarning.remove();
    }
}

// 🔥 CORREZIONE: Aggiorna addAdditionalCost per input HTML
async function addAdditionalCost() {
    const modalContent = `
        <div class="sol-form">
            <div class="sol-form-group">
                <label for="costTypeSelect" class="sol-form-label">Tipo di Costo</label>
                <select id="costTypeSelect" class="sol-form-input">
                    <option value="detention">Detention</option>
                    <option value="demurrage">Demurrage</option>
                </select>
            </div>
            <div class="sol-form-group">
                <label for="amountInput" class="sol-form-label">Importo</label>
                <input type="number" id="amountInput" class="sol-form-input" placeholder="0.00" step="0.01">
            </div>
            <div class="sol-form-group">
                <label for="notesInput" class="sol-form-label">Note</label>
                <textarea id="notesInput" class="sol-form-input" rows="3"></textarea>
            </div>
        </div>
    `;
    
    window.ModalSystem?.show({
        title: 'Aggiungi Costo Aggiuntivo',
        content: modalContent,
        buttons: [
            { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => window.ModalSystem.close() },
            {
                text: 'Aggiungi',
                class: 'sol-btn sol-btn-primary',
                onclick: async () => {
                    const shipmentId = getShipmentIdFromURL();
                    
                    // 🔥 CORREZIONE: Rimuovi la variabile duplicata
                    const costData = {
                        cost_type: document.getElementById('costTypeSelect').value,
                        amount: parseFloat(document.getElementById('amountInput').value) || 0,
                        notes: document.getElementById('notesInput').value.trim()
                    };
                    
                    if (costData.amount <= 0) {
                        window.notificationSystem?.warning('L\'importo deve essere maggiore di zero.');
                        return false;
                    }
                    
                    try {
                        window.notificationSystem?.info('Aggiunta del costo in corso...');
                        await window.dataManager.addAdditionalCost(shipmentId, costData);
                        window.notificationSystem?.success('Costo aggiuntivo aggiunto con successo!');
                        loadShipmentDetails(shipmentId);
                        return true;
                    } catch (error) {
                        console.error('Error adding additional cost:', error);
                        window.notificationSystem?.error(`Errore durante l\'aggiunta del costo: ${error.message}`);
                        return false;
                    }
                }
            }
        ]
    });
}

async function deleteAdditionalCost(costId) {
    const confirmed = await window.ModalSystem?.confirm({ 
        title: 'Conferma Eliminazione', 
        content: 'Sei sicuro di voler eliminare questo costo aggiuntivo?', 
        confirmText: 'Elimina', 
        cancelText: 'Annulla' 
    });
    
    if (confirmed) {
        try {
            window.notificationSystem?.info('Eliminazione costo in corso...');
            await window.dataManager.deleteAdditionalCost(costId);
            window.notificationSystem?.success('Costo aggiuntivo eliminato.');
            await loadShipmentDetails(getShipmentIdFromURL());
        } catch (error) {
            console.error('Error deleting additional cost:', error);
            window.notificationSystem?.error(`Errore durante l'eliminazione: ${error.message}`);
        }
    }
}

function toggleStatusEditMode() {
    const shipmentStatusSpan = document.getElementById('shipmentStatus');
    const shipmentStatusEditor = document.getElementById('shipmentStatusEditor');
    const editStatusBtn = document.getElementById('editStatusBtn');
    const saveStatusBtn = document.getElementById('saveStatusBtn');

    if (!shipmentStatusSpan || !shipmentStatusEditor || !editStatusBtn || !saveStatusBtn) return;

    shipmentStatusSpan.style.display = 'none';
    shipmentStatusEditor.style.display = 'inline-block';
    editStatusBtn.style.display = 'none';
    saveStatusBtn.style.display = 'inline-block';

    const currentStatus = shipmentStatusSpan.textContent.trim();
    const statusMap = {
        'In attesa': 'pending',
        'In transito': 'in_transit',
        'Consegnato': 'delivered',
        'Eccezione': 'exception',
        'Registrato': 'registered'
    };
    shipmentStatusEditor.value = statusMap[currentStatus] || currentStatus;
}

async function saveShipmentStatus() {
    const shipmentId = getShipmentIdFromURL();
    const newStatus = document.getElementById('shipmentStatusEditor')?.value;

    if (!newStatus) return;

    try {
        window.notificationSystem?.info('Salvataggio stato spedizione...');
        await window.dataManager.updateShipmentStatus(shipmentId, newStatus);
        window.notificationSystem?.success('Stato spedizione aggiornato!');
        loadShipmentDetails(shipmentId);
    } catch (error) {
        window.notificationSystem?.error(`Errore durante l'aggiornamento dello stato: ${error.message}`);
    }
}

// Helper Functions
function formatCurrency(value, minDecimals = 2, maxDecimals = 6) { 
    if (typeof value !== 'number' || isNaN(value)) return '€ 0,00';
    
    // Se il valore è molto piccolo, usa più decimali
    if (value > 0 && value < 0.01) {
        maxDecimals = 6;
    } else if (value > 0 && value < 0.1) {
        maxDecimals = 4;
    }
    
    return value.toLocaleString('it-IT', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals
    }); 
}

function formatWeight(value) { 
    if (typeof value !== 'number' || isNaN(value)) return '0 kg';
    return `${value.toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`; 
}

function formatVolume(value) { 
    if (typeof value !== 'number' || isNaN(value)) return '0 m³';
    return `${value.toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³`; 
}

function formatNumber(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toLocaleString('it-IT', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
}

// 🔥 NUOVA FUNZIONE: Formatta la quantità in formato italiano
function formatQuantity(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toLocaleString('it-IT', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    });
}

function formatDate(dateString) { 
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }); 
}

function formatStatus(rawStatus) {
    // Fallback if the unified mapping is not available
    if (!window.TrackingUnifiedMapping || !window.TrackingUnifiedMapping.mapStatus) {
        const statusKey = (rawStatus || 'registered').toLowerCase().replace(/ /g, '_');
        const label = rawStatus || 'Registrato';
        return `<span class="badge status-${statusKey}">${label}</span>`;
    }

    // Use the unified mapping for consistent status display
    const statusKey = window.TrackingUnifiedMapping.mapStatus(rawStatus || 'registered');
    const config = window.TrackingUnifiedMapping.STATUS_DISPLAY_CONFIG[statusKey] || window.TrackingUnifiedMapping.STATUS_DISPLAY_CONFIG['default'];

    return `<span class="badge badge-${config.class}" title="${config.label}">
                <i class="fas ${config.icon} mr-2"></i>${config.label}
            </span>`;
}



// Export delle funzioni principali per l'accesso globale
window.loadShipmentDetails = loadShipmentDetails;
window.addProduct = addProduct;
window.renderProductsTable = renderProductsTable;
window.editProductCosts = editProductCosts;
window.setupCostCalculation = setupCostCalculation;
window.updateCostCalculation = updateCostCalculation;
window.saveProductCosts = saveProductCosts;

console.log('✅ Page functions exported globally:', {
    loadShipmentDetails: typeof window.loadShipmentDetails,
    addProduct: typeof window.addProduct,
    renderProductsTable: typeof window.renderProductsTable,
    editProductCosts: typeof window.editProductCosts
});

// ✅ FORZA IL CARICAMENTO SE LA PAGINA È GIÀ PRONTA
if (document.readyState === 'loading') {
    // Il DOMContentLoaded esistente gestirà l'inizializzazione
    console.log('🔧 DOM still loading, existing DOMContentLoaded will handle init');
} else {
    // La pagina è già caricata, inizializza subito
    console.log('🔧 DOM already loaded, initializing immediately...');
    setTimeout(async () => {
        try {
            if (window.dataManager && window.ModalSystem && window.notificationSystem) {
                const shipmentId = getShipmentIdFromURL();
                if (shipmentId) {
                    console.log('🔧 Force loading shipment:', shipmentId);
                    await loadShipmentDetails(shipmentId);
                    setupEventListeners();
                }
            }
        } catch (error) {
            console.error('❌ Error in forced initialization:', error);
        }
    }, 1000);
}