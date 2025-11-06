/**
 * Spotify Streaming History Data Reader
 * JavaScript implementation based on DataReader.cs
 */

class SpotifyDataReader {
    constructor() {
        this.listens = [];
        this.artistNames = [];
        this.artistPlaycounts = [];
        this.blankTracks = 0;
        
        // Constants matching C# version
        this.payPerListenLow = 0.003;
        this.payPerListenHigh = 0.005;
        
        // Historical Spotify pricing data (based on research)
        // Spotify Premium Individual pricing history
        this.pricingHistory = [
            { startYear: 2009, endYear: 2011, price: 9.99, region: 'UK/EU' },
            { startYear: 2011, endYear: 2021, price: 9.99, region: 'US/Global' },
            { startYear: 2021, endYear: 2023, price: 9.99, region: 'Most markets' },
            { startYear: 2023, endYear: 2024, price: 10.99, region: 'US/UK' },
            { startYear: 2024, endYear: 2025, price: 11.99, region: 'US/UK' }
        ];
        
        // Results
        this.mostPlayedArtist = '';
        this.mostPlayedArtistCount = 0;
        this.secondMostPlayedArtist = '';
        this.secondMostPlayedArtistCount = 0;
        this.thirdMostPlayedArtist = '';
        this.thirdMostPlayedArtistCount = 0;
        
        // Local storage key
        this.STORAGE_KEY = 'spotify_data_analysis';
    }

    /**
     * Save processed data to local storage
     */
    saveToLocalStorage() {
        try {
            const data = {
                artistNames: this.artistNames,
                artistPlaycounts: this.artistPlaycounts,
                blankTracks: this.blankTracks,
                totalTracks: this.listens.length,
                mostPlayedArtist: this.mostPlayedArtist,
                mostPlayedArtistCount: this.mostPlayedArtistCount,
                secondMostPlayedArtist: this.secondMostPlayedArtist,
                secondMostPlayedArtistCount: this.secondMostPlayedArtistCount,
                thirdMostPlayedArtist: this.thirdMostPlayedArtist,
                thirdMostPlayedArtistCount: this.thirdMostPlayedArtistCount,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            console.log('Data saved to local storage');
            return true;
        } catch (error) {
            console.error('Error saving to local storage:', error);
            return false;
        }
    }

    /**
     * Load processed data from local storage
     */
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) {
                return false;
            }
            
            const data = JSON.parse(stored);
            
            this.artistNames = data.artistNames;
            this.artistPlaycounts = data.artistPlaycounts;
            this.blankTracks = data.blankTracks;
            this.mostPlayedArtist = data.mostPlayedArtist;
            this.mostPlayedArtistCount = data.mostPlayedArtistCount;
            this.secondMostPlayedArtist = data.secondMostPlayedArtist;
            this.secondMostPlayedArtistCount = data.secondMostPlayedArtistCount;
            this.thirdMostPlayedArtist = data.thirdMostPlayedArtist;
            this.thirdMostPlayedArtistCount = data.thirdMostPlayedArtistCount;
            
            // Reconstruct listens array with minimal data (just to preserve the count)
            this.listens = new Array(data.totalTracks);
            
            console.log(`Data loaded from local storage (saved: ${new Date(data.timestamp).toLocaleString()})`);
            return true;
        } catch (error) {
            console.error('Error loading from local storage:', error);
            return false;
        }
    }

    /**
     * Clear stored data from local storage
     */
    clearLocalStorage() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('Local storage cleared');
            return true;
        } catch (error) {
            console.error('Error clearing local storage:', error);
            return false;
        }
    }

    /**
     * Check if data exists in local storage
     */
    hasStoredData() {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    }

    /**
     * Load and parse JSON files
     */
    async loadFiles(files) {
        this.listens = [];
        
        for (const file of files) {
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                // Handle both array format and {tracks: []} format
                const tracks = Array.isArray(data) ? data : data.tracks;
                
                if (tracks && Array.isArray(tracks)) {
                    this.listens.push(...tracks);
                }
            } catch (error) {
                console.error(`Error parsing ${file.name}:`, error);
            }
        }
        
        console.log(`Processing ${this.listens.length} tracks`);
        return this.listens.length;
    }

    /**
     * Process all tracks and build artist statistics
     */
    processTracks(onProgress = null) {
        this.artistNames = [];
        this.artistPlaycounts = [];
        this.blankTracks = 0;
        
        const totalTracks = this.listens.length;
        
        for (let i = 0; i < totalTracks; i++) {
            const listen = this.listens[i];
            
            if (listen.master_metadata_album_artist_name && 
                listen.master_metadata_album_artist_name !== '') {
                
                const artistName = listen.master_metadata_album_artist_name;
                const artistIndex = this.artistNames.indexOf(artistName);
                
                if (artistIndex === -1) {
                    this.artistNames.push(artistName);
                    this.artistPlaycounts.push(1);
                } else {
                    this.artistPlaycounts[artistIndex]++;
                }
            } else {
                this.blankTracks++;
            }
            
            // Report progress periodically
            if (onProgress && i % 1000 === 0) {
                onProgress(i, totalTracks);
            }
        }
        
        if (onProgress) {
            onProgress(totalTracks, totalTracks);
        }
        
        console.log('Done!');
    }

    /**
     * Calculate total paid to Spotify over time using historical pricing
     */
    calculateSpotifyPayments(startYear = 2009, endYear = 2025) {
        let totalPaid = 0;
        let breakdown = [];
        
        for (let year = startYear; year < endYear; year++) {
            const pricing = this.pricingHistory.find(p => year >= p.startYear && year < p.endYear);
            if (pricing) {
                const monthlyPrice = pricing.price;
                const yearlyTotal = monthlyPrice * 12;
                totalPaid += yearlyTotal;
                breakdown.push({
                    year: year,
                    monthlyPrice: monthlyPrice,
                    yearlyTotal: yearlyTotal
                });
            }
        }
        
        // Add partial year if current year
        const currentYear = new Date().getFullYear();
        if (endYear > currentYear) {
            const currentMonth = new Date().getMonth() + 1;
            const pricing = this.pricingHistory.find(p => currentYear >= p.startYear && currentYear < p.endYear);
            if (pricing) {
                const partialYearTotal = pricing.price * currentMonth;
                totalPaid += partialYearTotal;
                breakdown.push({
                    year: currentYear,
                    monthlyPrice: pricing.price,
                    yearlyTotal: partialYearTotal,
                    partial: true,
                    months: currentMonth
                });
            }
        }
        
        return { totalPaid, breakdown, years: endYear - startYear };
    }

    /**
     * Get top N artists sorted by play count
     */
    getTopArtists(n = 10) {
        const artists = this.artistNames.map((name, index) => ({
            name,
            plays: this.artistPlaycounts[index],
            lowEstimate: this.artistPlaycounts[index] * this.payPerListenLow,
            highEstimate: this.artistPlaycounts[index] * this.payPerListenHigh
        }));
        
        // Sort by plays descending
        artists.sort((a, b) => b.plays - a.plays);
        
        return artists.slice(0, n);
    }

    /**
     * Calculate and output statistics (mirrors C# CalculateCounts method)
     */
    calculateCounts() {
        let output = '';
        
        // Find most played artist
        let mostPlayedIndex = -1;
        for (let i = 0; i < this.artistNames.length; i++) {
            if (this.artistPlaycounts[i] > this.mostPlayedArtistCount) {
                this.mostPlayedArtistCount = this.artistPlaycounts[i];
                this.mostPlayedArtist = this.artistNames[i];
                mostPlayedIndex = i;
            }
        }
        
        // Find second most played artist
        let secondMostPlayedIndex = -1;
        for (let i = 0; i < this.artistNames.length; i++) {
            if (i === mostPlayedIndex) continue;
            
            if (this.artistPlaycounts[i] > this.secondMostPlayedArtistCount) {
                this.secondMostPlayedArtistCount = this.artistPlaycounts[i];
                this.secondMostPlayedArtist = this.artistNames[i];
                secondMostPlayedIndex = i;
            }
        }
        
        // Find third most played artist
        for (let i = 0; i < this.artistNames.length; i++) {
            if (i === mostPlayedIndex) continue;
            if (i === secondMostPlayedIndex) continue;
            
            if (this.artistPlaycounts[i] > this.thirdMostPlayedArtistCount) {
                this.thirdMostPlayedArtistCount = this.artistPlaycounts[i];
                this.thirdMostPlayedArtist = this.artistNames[i];
            }
        }
        
        // Calculate totals
        const validListens = this.listens.length - this.blankTracks;
        const lowEstimate = validListens * this.payPerListenLow;
        const highEstimate = validListens * this.payPerListenHigh;
        
        // Calculate Spotify payments
        const spotifyPayments = this.calculateSpotifyPayments(2009, 2025);
        
        // Calculate top artist payments
        const topArtistLow = this.mostPlayedArtistCount * this.payPerListenLow;
        const topArtistHigh = this.mostPlayedArtistCount * this.payPerListenHigh;
        
        // Store summary data for UI display
        this.summaryStats = {
            totalListens: this.listens.length,
            validListens: validListens,
            years: spotifyPayments.years,
            artistCount: this.artistNames.length,
            spotifyTotal: spotifyPayments.totalPaid,
            topArtist: this.mostPlayedArtist,
            topArtistPlays: this.mostPlayedArtistCount,
            topArtistLow: topArtistLow,
            topArtistHigh: topArtistHigh
        };
        
        // Output money to artists
        output += `Money to artists over ${validListens} listens (low estimate $0.003 per listen): $${lowEstimate.toFixed(2)}\n`;
        output += `Money to artists over ${validListens} listens (high estimate $0.005 per listen): $${highEstimate.toFixed(2)}\n\n`;
        
        console.log(`Money to artists over ${validListens} listens (low estimate $0.003 per listen): $${lowEstimate.toFixed(2)}`);
        console.log(`Money to artists over ${validListens} listens (high estimate $0.005 per listen): $${highEstimate.toFixed(2)}`);
        
        // Output top artists
        const mostPlayedLow = this.mostPlayedArtistCount * this.payPerListenLow;
        const mostPlayedHigh = this.mostPlayedArtistCount * this.payPerListenHigh;
        output += `Most played artist at ${this.mostPlayedArtistCount} plays: ${this.mostPlayedArtist}, paid $${mostPlayedLow.toFixed(2)} - $${mostPlayedHigh.toFixed(2)}\n`;
        console.log(`Most played artist at ${this.mostPlayedArtistCount} plays: ${this.mostPlayedArtist}, paid $${mostPlayedLow.toFixed(2)} - $${mostPlayedHigh.toFixed(2)}`);
        
        const secondPlayedLow = this.secondMostPlayedArtistCount * this.payPerListenLow;
        const secondPlayedHigh = this.secondMostPlayedArtistCount * this.payPerListenHigh;
        output += `Second most played artist at ${this.secondMostPlayedArtistCount} plays: ${this.secondMostPlayedArtist}, paid $${secondPlayedLow.toFixed(2)} - $${secondPlayedHigh.toFixed(2)}\n`;
        console.log(`Second most played artist at ${this.secondMostPlayedArtistCount} plays: ${this.secondMostPlayedArtist}, paid $${secondPlayedLow.toFixed(2)} - $${secondPlayedHigh.toFixed(2)}`);
        
        const thirdPlayedLow = this.thirdMostPlayedArtistCount * this.payPerListenLow;
        const thirdPlayedHigh = this.thirdMostPlayedArtistCount * this.payPerListenHigh;
        output += `Third most played artist at ${this.thirdMostPlayedArtistCount} plays: ${this.thirdMostPlayedArtist}, paid $${thirdPlayedLow.toFixed(2)} - $${thirdPlayedHigh.toFixed(2)}\n\n`;
        console.log(`Third most played artist at ${this.thirdMostPlayedArtistCount} plays: ${this.thirdMostPlayedArtist}, paid $${thirdPlayedLow.toFixed(2)} - $${thirdPlayedHigh.toFixed(2)}`);
        
        // Average listens per artist
        const averageListens = validListens / this.artistNames.length;
        const avgLow = averageListens * this.payPerListenLow;
        const avgHigh = averageListens * this.payPerListenHigh;
        output += `Average listens across ${this.artistNames.length} artists: ${averageListens.toFixed(2)}, paying average $${avgLow.toFixed(2)} - $${avgHigh.toFixed(2)}\n\n`;
        console.log(`Average listens across ${this.artistNames.length} artists: ${averageListens.toFixed(2)}, paying average $${avgLow.toFixed(2)} - $${avgHigh.toFixed(2)}`);
        
        // Calculate realistic Spotify payments based on historical pricing
        // Determine subscription period from data (2009-2025 based on file names)
        const currency = '£'; // Using GBP as per original
        
        output += `\n=== SPOTIFY SUBSCRIPTION COST (Historical Pricing) ===\n`;
        output += `Period: 2009 - 2025 (${spotifyPayments.years} years)\n`;
        output += `Total paid to Spotify: ${currency}${spotifyPayments.totalPaid.toFixed(2)}\n`;
        output += `\nBreakdown by period:\n`;
        
        // Group breakdown by pricing periods
        let currentPrice = null;
        let periodStart = null;
        let periodTotal = 0;
        
        for (const item of spotifyPayments.breakdown) {
            if (currentPrice !== item.monthlyPrice) {
                if (currentPrice !== null) {
                    output += `${periodStart}-${item.year - 1}: ${currency}${currentPrice.toFixed(2)}/month = ${currency}${periodTotal.toFixed(2)}\n`;
                }
                currentPrice = item.monthlyPrice;
                periodStart = item.year;
                periodTotal = item.yearlyTotal;
            } else {
                periodTotal += item.yearlyTotal;
            }
        }
        
        // Output final period
        if (currentPrice !== null) {
            const lastYear = spotifyPayments.breakdown[spotifyPayments.breakdown.length - 1].year;
            output += `${periodStart}-${lastYear}: ${currency}${currentPrice.toFixed(2)}/month = ${currency}${periodTotal.toFixed(2)}\n`;
        }
        
        console.log(`\nPaid Spotify roughly ${currency}${spotifyPayments.totalPaid.toFixed(2)} over ${spotifyPayments.years} years (2009-2025) using historical pricing data`);
        console.log(`Note: Pricing increased from £9.99 to £10.99 (2023) and to £11.99 (2024)`);
        
        return output;
    }

    /**
     * Export artist data (mirrors the file write in C#)
     */
    getArtistData() {
        let data = '';
        for (let i = 0; i < this.artistNames.length; i++) {
            data += `${this.artistPlaycounts[i]}: ${this.artistNames[i]}\n`;
        }
        return data;
    }

    /**
     * Download artist data as text file
     */
    downloadArtistData() {
        const data = this.getArtistData();
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'artistData.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// UI Controller
class UIController {
    constructor() {
        this.dataReader = new SpotifyDataReader();
        this.selectedFiles = [];
        
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.processBtn = document.getElementById('processBtn');
        this.results = document.getElementById('results');
        this.output = document.getElementById('output');
        this.loading = document.getElementById('loading');
        this.progressText = document.getElementById('progressText');
        
        this.initializeEventListeners();
        this.checkForStoredData();
    }

    /**
     * Check if there's stored data and offer to load it
     */
    checkForStoredData() {
        if (this.dataReader.hasStoredData()) {
            // Show a message with option to load or clear
            const banner = document.createElement('div');
            banner.id = 'storedDataBanner';
            banner.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4';
            banner.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <svg class="h-5 w-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div>
                            <p class="text-sm font-medium text-blue-800">Previously analyzed data found</p>
                            <p class="text-xs text-blue-600">You can load your previous analysis or upload new files</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button id="loadStoredBtn" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded transition-colors">
                            Load Previous Data
                        </button>
                        <button id="clearStoredBtn" class="bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded transition-colors">
                            Clear & Start Fresh
                        </button>
                    </div>
                </div>
            `;
            
            const container = document.querySelector('.container');
            container.insertBefore(banner, container.firstChild.nextSibling);
            
            document.getElementById('loadStoredBtn').addEventListener('click', () => this.loadStoredData());
            document.getElementById('clearStoredBtn').addEventListener('click', () => this.clearStoredData());
        }
    }

    /**
     * Load stored data and display results
     */
    loadStoredData() {
        this.loading.classList.remove('hidden');
        this.progressText.textContent = 'Loading stored data...';
        
        setTimeout(() => {
            if (this.dataReader.loadFromLocalStorage()) {
                const outputText = this.dataReader.calculateCounts();
                this.output.textContent = outputText;
                this.results.classList.remove('hidden');
                
                // Display summary hero
                this.displaySummaryHero();
                
                // Display top artists table
                this.displayTopArtistsTable();
                
                // Add download button
                this.addDownloadButton();
                
                // Remove the banner
                const banner = document.getElementById('storedDataBanner');
                if (banner) banner.remove();
            } else {
                alert('Error loading stored data');
            }
            
            this.loading.classList.add('hidden');
        }, 100);
    }

    /**
     * Clear stored data
     */
    clearStoredData() {
        if (confirm('Are you sure you want to clear the stored data? This cannot be undone.')) {
            this.dataReader.clearLocalStorage();
            const banner = document.getElementById('storedDataBanner');
            if (banner) banner.remove();
            
            // Clear UI
            this.results.classList.add('hidden');
            this.output.textContent = '';
            const table = document.getElementById('topArtistsTable');
            if (table) table.remove();
        }
    }

    initializeEventListeners() {
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.processBtn.addEventListener('click', () => this.processFiles());
        
        // Drag and drop
        const dropZone = this.fileInput.parentElement.parentElement;
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500', 'bg-blue-50');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            this.fileInput.files = e.dataTransfer.files;
            this.handleFileSelect({ target: this.fileInput });
        });
    }

    handleFileSelect(event) {
        this.selectedFiles = Array.from(event.target.files);
        
        if (this.selectedFiles.length > 0) {
            this.fileList.innerHTML = `
                <div class="mt-4">
                    <h3 class="font-semibold text-gray-700 mb-2">Selected Files (${this.selectedFiles.length}):</h3>
                    <ul class="text-sm text-gray-600 space-y-1">
                        ${this.selectedFiles.map(f => `<li>📄 ${f.name}</li>`).join('')}
                    </ul>
                </div>
            `;
            this.processBtn.disabled = false;
        } else {
            this.fileList.innerHTML = '';
            this.processBtn.disabled = true;
        }
    }

    async processFiles() {
        this.loading.classList.remove('hidden');
        this.results.classList.add('hidden');
        
        try {
            // Load files
            this.progressText.textContent = 'Loading files...';
            const trackCount = await this.dataReader.loadFiles(this.selectedFiles);
            
            // Process tracks
            this.progressText.textContent = 'Processing tracks...';
            
            // Use setTimeout to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 100));
            
            this.dataReader.processTracks((current, total) => {
                this.progressText.textContent = `Processing ${current} / ${total} tracks...`;
            });
            
            // Calculate results
            this.progressText.textContent = 'Calculating statistics...';
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const outputText = this.dataReader.calculateCounts();
            
            // Save to local storage
            this.progressText.textContent = 'Saving to local storage...';
            await new Promise(resolve => setTimeout(resolve, 100));
            this.dataReader.saveToLocalStorage();
            
            // Display results
            this.output.textContent = outputText;
            this.results.classList.remove('hidden');
            
            // Display summary hero
            this.displaySummaryHero();
            
            // Create top 10 artists table
            this.displayTopArtistsTable();
            
            // Add download button
            this.addDownloadButton();
            
            // Remove stored data banner if it exists
            const banner = document.getElementById('storedDataBanner');
            if (banner) banner.remove();
            
        } catch (error) {
            console.error('Error processing files:', error);
            alert('Error processing files. Check console for details.');
        } finally {
            this.loading.classList.add('hidden');
        }
    }

    addDownloadButton() {
        // Check if button already exists
        if (document.getElementById('downloadArtistDataBtn')) {
            return;
        }
        
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'downloadArtistDataBtn';
        downloadBtn.textContent = 'Download Artist Data';
        downloadBtn.className = 'mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors';
        downloadBtn.onclick = () => this.dataReader.downloadArtistData();
        
        this.output.parentElement.appendChild(downloadBtn);
    }

    displayTopArtistsTable() {
        const topArtists = this.dataReader.getTopArtists(10);
        
        // Check if table already exists and remove it
        const existingTable = document.getElementById('topArtistsTable');
        if (existingTable) {
            existingTable.remove();
        }
        
        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.id = 'topArtistsTable';
        tableContainer.className = 'mt-6';
        
        tableContainer.innerHTML = `
            <h3 class="text-xl font-semibold mb-4 text-gray-700">Top 10 Most Streamed Artists</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">#</th>
                            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Artist</th>
                            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Plays</th>
                            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Low Estimate</th>
                            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">High Estimate</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${topArtists.map((artist, index) => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}</td>
                                <td class="px-6 py-4 text-sm font-medium text-gray-900">${this.escapeHtml(artist.name)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">${artist.plays.toLocaleString()}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">$${artist.lowEstimate.toFixed(2)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">$${artist.highEstimate.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        // Insert table after the output div
        this.output.parentElement.insertBefore(tableContainer, this.output.nextSibling);
    }

    /**
     * Display the hero summary section with highlighted stats
     */
    displaySummaryHero() {
        const stats = this.dataReader.summaryStats;
        if (!stats) return;
        
        // Check if hero already exists and remove it
        const existingHero = document.getElementById('summaryHero');
        if (existingHero) {
            existingHero.remove();
        }
        
        // Create hero container
        const heroContainer = document.createElement('div');
        heroContainer.id = 'summaryHero';
        heroContainer.className = 'mb-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 border border-green-200';
        
        heroContainer.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Your Spotify Journey</h2>
            
            <div class="space-y-4">
                <!-- Total Listens -->
                <p class="text-xl text-gray-700 leading-relaxed">
                    You've listened to a total of 
                    <span class="inline-block bg-green-500 text-white font-bold px-3 py-1 rounded-lg text-2xl mx-1">
                        ${stats.totalListens.toLocaleString()}
                    </span>
                    tracks over 
                    <span class="inline-block bg-blue-500 text-white font-bold px-3 py-1 rounded-lg text-2xl mx-1">
                        ${stats.years}
                    </span>
                    years, split across 
                    <span class="inline-block bg-purple-500 text-white font-bold px-3 py-1 rounded-lg text-2xl mx-1">
                        ${stats.artistCount.toLocaleString()}
                    </span>
                    artists.
                </p>
                
                <!-- Spotify Payments -->
                <p class="text-xl text-gray-700 leading-relaxed">
                    You've paid Spotify roughly 
                    <span class="inline-block bg-red-500 text-white font-bold px-3 py-1 rounded-lg text-2xl mx-1">
                        £${stats.spotifyTotal.toFixed(2)}
                    </span>
                    since 2009.
                </p>
                
                <!-- Top Artist -->
                <p class="text-xl text-gray-700 leading-relaxed">
                    Your favourite artist, 
                    <span class="inline-block bg-yellow-500 text-gray-900 font-bold px-3 py-1 rounded-lg text-xl mx-1">
                        ${this.escapeHtml(stats.topArtist)}
                    </span>
                    (${stats.topArtistPlays.toLocaleString()} plays), has earned somewhere between 
                    <span class="inline-block bg-orange-500 text-white font-bold px-2 py-1 rounded-lg mx-1">
                        $${stats.topArtistLow.toFixed(2)}
                    </span>
                    and
                    <span class="inline-block bg-orange-500 text-white font-bold px-2 py-1 rounded-lg mx-1">
                        $${stats.topArtistHigh.toFixed(2)}
                    </span>
                    from your streams.
                </p>
            </div>
        `;
        
        // Insert hero at the top of results
        this.results.insertBefore(heroContainer, this.results.firstChild);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UIController();
});
