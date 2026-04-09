import { db, onSnapshot, collection, query, orderBy, limit, addDoc, serverTimestamp, getDocs, where, Timestamp } from './firebase-init.js';

let stats = { total: 0, fraud: 0 };

function formatAmount(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function updateStats(score, status) {
    stats.total++;
    if (status === 'Blocked' || status === 'Flagged') {
        stats.fraud++;
    }
    document.getElementById('total-transactions').innerText = stats.total.toLocaleString();
    document.getElementById('fraud-detected').innerText = stats.fraud.toLocaleString();
    
    let safePct = stats.total > 0 ? ((stats.total - stats.fraud) / stats.total * 100).toFixed(1) : 100;
    document.getElementById('safe-transactions').innerText = safePct + '%';
    
    let riskRate = stats.total > 0 ? (stats.fraud / stats.total * 100).toFixed(2) : 0;
    document.getElementById('risk-rate').innerText = riskRate + '%';
    document.getElementById('system-health-rate').innerText = safePct + '%';
}

function addTableRow(docId, data) {
    const table = document.getElementById('live-transactions-table');
    
    const tr = document.createElement('tr');
    tr.id = `tx-${docId}`;
    
    // Status colors
    let rowClass = 'hover:bg-slate-50/50 transition-colors cursor-pointer';
    let bgColor = 'bg-secondary/10';
    let textColor = 'text-secondary';
    let actionBg = 'bg-secondary-container/20';
    let actionText = 'text-secondary';

    if (data.status === 'Blocked') {
        rowClass = 'bg-red-50/30 hover:bg-red-50/50 transition-colors cursor-pointer';
        bgColor = 'bg-tertiary/10';
        textColor = 'text-tertiary';
        actionBg = 'bg-tertiary-container/20';
        actionText = 'text-tertiary-container';
    } else if (data.status === 'Flagged') {
        rowClass = 'bg-orange-50/30 hover:bg-orange-50/50 transition-colors cursor-pointer';
        bgColor = 'bg-orange-100 text-orange-600';
        textColor = 'text-orange-600';
        actionBg = 'bg-orange-100';
        actionText = 'text-orange-600';
    }
    tr.className = rowClass;

    const timeString = data.timestamp ? new Date(data.timestamp.toMillis()).toLocaleTimeString() : new Date().toLocaleTimeString();
    const loc = data.location || 'Unknown';
    const dev = (data.deviceChanged ? '⚠️ ' : '') + (data.deviceInfo?.platform || data.device || 'Unknown');

    tr.innerHTML = `
        <td class="px-6 py-4 text-sm font-bold">${data.userId || 'Unknown'}</td>
        <td class="px-6 py-4 text-sm font-medium">${formatAmount(data.amount)}</td>
        <td class="px-6 py-4 text-sm text-slate-600">${loc}</td>
        <td class="px-6 py-4 text-sm text-slate-600">${dev}</td>
        <td class="px-6 py-4 text-xs text-slate-400">${timeString}</td>
        <td class="px-6 py-4 text-center">
        <span class="inline-block px-2 py-1 rounded ${bgColor} ${textColor} font-bold text-[10px]">${(data.score || 0).toString().padStart(2, '0')}</span>
        </td>
        <td class="px-6 py-4 text-right">
        <span class="px-3 py-1 rounded-full ${actionBg} ${actionText} font-bold text-[10px] uppercase">${data.status || 'Pending'}</span>
        </td>
    `;
    
    tr.onclick = () => showTransactionDetails(data);
    
    table.prepend(tr);
    if(table.children.length > 20) {
        table.removeChild(table.lastChild);
    }
}

function showTransactionDetails(data) {
    document.getElementById('analysis-score').innerText = data.score || 0;
    document.getElementById('analysis-threat-msg').innerText = data.threatMsg || 'Analysis complete.';
    document.getElementById('analysis-recommendation').innerText = data.recommendation || '-';
    
    const tb = document.getElementById('analysis-triggers');
    tb.innerHTML = '';
    if(data.triggers && data.triggers.length > 0) {
        data.triggers.forEach(t => {
            tb.innerHTML += `<span class="px-3 py-1 rounded-lg bg-white/5 text-[11px] font-semibold border border-white/10">${t}</span>`;
        });
    } else {
        tb.innerHTML = `<span class="px-3 py-1 rounded-lg bg-white/5 text-[11px] font-semibold border border-white/10">No Anomalies</span>`;
    }
    
    const banner = document.getElementById('analysis-banner');
    if (data.status === 'Blocked') {
        banner.className = 'px-3 py-1 rounded-full bg-tertiary/20 text-tertiary-fixed text-[10px] font-bold uppercase tracking-widest border border-tertiary/30';
        banner.innerText = 'High Risk';
    } else if (data.status === 'Flagged') {
        banner.className = 'px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-widest border border-orange-500/30';
        banner.innerText = 'Suspicious';
    } else {
        banner.className = 'px-3 py-1 rounded-full bg-secondary/20 text-secondary-fixed text-[10px] font-bold uppercase tracking-widest border border-secondary/30';
        banner.innerText = 'Safe';
    }
}

function renderAlert(data) {
    if (data.status !== 'Blocked' && data.status !== 'Flagged') return;
    
    const list = document.getElementById('recent-alerts-list');
    const div = document.createElement('div');
    div.className = 'flex gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group';
    
    let iconColor = data.status === 'Blocked' ? 'bg-tertiary/10 text-tertiary' : 'bg-orange-100 text-orange-600';
    let icon = data.status === 'Blocked' ? 'security_update_warning' : 'warning';
    
    let reason = (data.triggers && data.triggers.length > 0) ? data.triggers.join(', ') : 'Anomalous Behavior';
    
    div.innerHTML = `
        <div class="w-10 h-10 rounded-lg ${iconColor} flex-shrink-0 flex items-center justify-center">
            <span class="material-symbols-outlined text-xl">${icon}</span>
        </div>
        <div class="min-w-0">
            <p class="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">${reason} Detected: ${data.userId}</p>
            <p class="text-[11px] text-slate-500 mt-0.5">Amt: ${formatAmount(data.amount)} | Loc: ${data.location}</p>
            <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Just Now</p>
        </div>
    `;
    list.prepend(div);
    if(list.children.length > 5) {
        list.removeChild(list.lastChild);
    }
}

// Generate test transaction manually via quick form
document.getElementById('run-risk-engine').onclick = async () => {
    const btn = document.getElementById('run-risk-engine');
    btn.innerHTML = 'Testing...';
    btn.disabled = true;
    
    const isNewDeviceSim = Math.random() > 0.8;
    const isLocationMismatchSim = Math.random() > 0.8;
    const inputLoc = document.getElementById('sim-location').value || 'Mumbai';
    
    const txData = {
        userId: document.getElementById('sim-user-id').value || 'USR-99210',
        amount: parseFloat(document.getElementById('sim-amount').value || Math.floor(Math.random() * 5000)),
        location: inputLoc,
        previousLocation: isLocationMismatchSim ? 'Unknown' : inputLoc,
        deviceInfo: {
            userAgent: navigator.userAgent,
            platform: document.getElementById('sim-device').value || navigator.platform
        },
        deviceChanged: isNewDeviceSim,
        locationMismatch: isLocationMismatchSim,
        unusualBehavior: false,
        transactionFrequency: 1,
        timestamp: serverTimestamp()
    };
    
    // Process Risk Engine Client Side
    let score = 0;
    let triggers = [];

    // 1. Amount anomaly
    if (txData.amount > 50000) {
        score += 30;
        triggers.push('Large Txn');
    }

    // 2. New device
    if (txData.deviceChanged) {
        score += 25;
        triggers.push('New Device');
    }

    // 3. Location mismatch
    if (txData.location && (txData.location.toLowerCase().includes('unknown') || txData.location.toLowerCase().includes('vpn'))) {
        score += 20;
        triggers.push('Proxy Detected');
    } else if (txData.locationMismatch) {
        score += 20;
        triggers.push('Location Mismatch');
    }

    // 4. High frequency logic
    if (txData.userId) {
        const fiveMinsAgo = new Date(Date.now() - 5 * 60000);
        try {
            const recentTxQuery = query(
                collection(db, 'transactions'),
                where('userId', '==', txData.userId),
                where('timestamp', '>=', Timestamp.fromDate(fiveMinsAgo))
            );
            const recentTxSnap = await getDocs(recentTxQuery);
            txData.transactionFrequency = recentTxSnap.size + 1; // Update behavior explicit variable
            if (recentTxSnap.size >= 3) {
                // If they already have 3 or more (this one makes 4+)
                score += 25;
                txData.unusualBehavior = true; // Set explicit behavior tracker
                triggers.push('Velocity Breach');
            }
        } catch (err) {
            console.error("Error fetching recent transactions:", err);
        }
    }

    // Calculate Status mapping
    let status = 'Approved';
    let badge = 'Safe';
    if (score >= 70) {
        status = 'Blocked';
        badge = 'High Risk';
    } else if (score >= 40) {
        status = 'Flagged';
        badge = 'Suspicious';
    }

    txData.score = score;
    txData.status = status;
    txData.riskBadge = badge;
    txData.triggers = triggers;
    txData.threatMsg = score >= 70 
        ? 'System detected unusually high-risk pattern likely indicative of account takeover.'
        : score >= 40 
            ? 'Unusual activity triggered moderate risk threshold. Monitor carefully.'
            : 'Transaction aligns with established user behavioral model. No significant threat detected.';
    txData.recommendation = score >= 70
        ? 'Immediate manual review required. Temporary hold placed on account funds.'
        : score >= 40 
            ? 'Advise user via 2FA for confirmation.'
            : 'Proceed with standard processing.';
    
    try {
        const txRef = await addDoc(collection(db, 'transactions'), txData);
        
        // Write to secondary fraud logs collection if dangerous
        if (txData.status === 'Blocked' || txData.status === 'Flagged') {
            await addDoc(collection(db, 'fraud_logs'), {
                ...txData,
                originalTxId: txRef.id,
                logTimestamp: serverTimestamp()
            });
        }
    } catch(e) {
        console.error('Error adding doc: ', e);
        alert('Database error: ' + e.message);
    }
    
    setTimeout(() => {
        btn.innerHTML = 'Run Risk Engine';
        btn.disabled = false;
    }, 1000);
};

// Listen for updates from Firestore
const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(20));
onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
            const data = change.doc.data();
            addTableRow(change.doc.id, data);
            updateStats(data.score, data.status);
            renderAlert(data);
            showTransactionDetails(data);
        }
        if (change.type === 'modified') {
            const data = change.doc.data();
            const existingRow = document.getElementById(`tx-${change.doc.id}`);
            if(existingRow) {
                existingRow.remove();
            }
            addTableRow(change.doc.id, data);
            updateStats(data.score, data.status);
            renderAlert(data);
            showTransactionDetails(data);
        }
    });
});

// Dark Mode Toggle
document.getElementById('dark-mode-toggle').onclick = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        html.classList.add('light');
    } else {
        html.classList.remove('light');
        html.classList.add('dark');
    }
};

// Global Search Filtering
const searchInput = document.getElementById('global-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#live-transactions-table tr');
        rows.forEach(row => {
            if (row.innerText.toLowerCase().includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}
