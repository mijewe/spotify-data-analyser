/**
 * Spotify Streaming History Data Reader
 * JavaScript implementation based on DataReader.cs
 */

class SpotifyDataReader {
    constructor() {
        this.listens = [];
        this.artistNames = [];
        this.artistPlaycounts = [];
        this.artistYearlyData = {}; // Track streams per artist per year
        this.albumNames = [];
        this.albumArtists = [];
        this.albumPlaycounts = [];
        this.albumTrackCounts = []; // Number of unique tracks per album
        this.albumTracks = []; // Set of track names per album
        this.blankTracks = 0;
        
        // Constants matching C# version
        this.payPerListen = 0.004; // Average pay per stream
        this.artistShareOfStreaming = 0.20; // Artists get ~20% of label's streaming revenue
        this.artistShareOfAlbum = 0.20; // Artists get ~20% of album sales (same as streaming for fair comparison)
        this.albumPriceGBP = 10.00; // Average album price in GBP
        this.albumPriceUSD = 12.99; // Average album price in USD
        
        // Album purchase threshold
        this.albumPurchaseThreshold = 5; // Minimum album plays to consider "worth buying"
        
        // Currency settings
        this.currency = 'GBP'; // 'GBP' or 'USD'
        this.exchangeRate = 1.27; // GBP to USD rate (approximate)
        
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
     * Set currency preference
     */
    setCurrency(currency) {
        this.currency = currency;
        localStorage.setItem('spotify_currency', currency);
    }

    /**
     * Get currency preference
     */
    getCurrency() {
        return this.currency;
    }

    /**
     * Get currency symbol
     */
    getCurrencySymbol() {
        return this.currency === 'GBP' ? '£' : '$';
    }

    /**
     * Convert GBP to selected currency
     */
    convertCurrency(amount) {
        if (this.currency === 'USD') {
            return amount * this.exchangeRate;
        }
        return amount;
    }

    /**
     * Save processed data to local storage
     */
    saveToLocalStorage() {
        try {
            const data = {
                artistNames: this.artistNames,
                artistPlaycounts: this.artistPlaycounts,
                artistYearlyData: this.artistYearlyData,
                albumNames: this.albumNames,
                albumArtists: this.albumArtists,
                albumPlaycounts: this.albumPlaycounts,
                albumTrackCounts: this.albumTrackCounts,
                blankTracks: this.blankTracks,
                totalTracks: this.listens.length,
                earliestYear: this.earliestYear,
                latestYear: this.latestYear,
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
            this.artistYearlyData = data.artistYearlyData || {};
            this.albumNames = data.albumNames || [];
            this.albumArtists = data.albumArtists || [];
            this.albumPlaycounts = data.albumPlaycounts || [];
            this.albumTrackCounts = data.albumTrackCounts || [];
            this.blankTracks = data.blankTracks;
            this.earliestYear = data.earliestYear || 2009;
            this.latestYear = data.latestYear || new Date().getFullYear();
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
        this.artistYearlyData = {};
        this.albumNames = [];
        this.albumArtists = [];
        this.albumPlaycounts = [];
        this.albumTrackCounts = [];
        this.albumTracks = [];
        this.blankTracks = 0;
        this.earliestYear = null;
        this.latestYear = null;
        
        const totalTracks = this.listens.length;
        
        for (let i = 0; i < totalTracks; i++) {
            const listen = this.listens[i];
            
            // Track earliest and latest years
            if (listen.ts) {
                const year = new Date(listen.ts).getFullYear();
                if (this.earliestYear === null || year < this.earliestYear) {
                    this.earliestYear = year;
                }
                if (this.latestYear === null || year > this.latestYear) {
                    this.latestYear = year;
                }
            }
            
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
                
                // Track yearly data for artist
                if (listen.ts) {
                    const year = new Date(listen.ts).getFullYear();
                    if (!this.artistYearlyData[artistName]) {
                        this.artistYearlyData[artistName] = {};
                    }
                    if (!this.artistYearlyData[artistName][year]) {
                        this.artistYearlyData[artistName][year] = 0;
                    }
                    this.artistYearlyData[artistName][year]++;
                }
                
                // Track album plays
                if (listen.master_metadata_album_album_name && 
                    listen.master_metadata_album_album_name !== '') {
                    
                    const albumName = listen.master_metadata_album_album_name;
                    const trackName = listen.master_metadata_track_name || '';
                    const albumKey = `${albumName}|||${artistName}`; // Use separator to create unique key
                    const albumIndex = this.albumNames.indexOf(albumKey);
                    
                    if (albumIndex === -1) {
                        this.albumNames.push(albumKey);
                        this.albumArtists.push(artistName);
                        this.albumPlaycounts.push(1);
                        this.albumTracks.push(new Set([trackName]));
                    } else {
                        this.albumPlaycounts[albumIndex]++;
                        if (trackName) {
                            this.albumTracks[albumIndex].add(trackName);
                        }
                    }
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
        
        // Calculate track counts for each album
        this.albumTrackCounts = this.albumTracks.map(trackSet => trackSet.size);
        
        // Default to current year if we couldn't determine from data
        if (!this.earliestYear) this.earliestYear = 2009;
        if (!this.latestYear) this.latestYear = new Date().getFullYear();
        
        console.log('Done!');
        console.log(`Data range: ${this.earliestYear} - ${this.latestYear}`);
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
        const artists = this.artistNames.map((name, index) => {
            const earningsUSD = this.artistPlaycounts[index] * this.payPerListen;
            
            // Calculate label earnings and artist share (20% of label)
            const labelEarning = this.currency === 'GBP' ? earningsUSD / this.exchangeRate : earningsUSD;
            
            return {
                name,
                plays: this.artistPlaycounts[index],
                estimate: labelEarning * this.artistShareOfStreaming,
                labelEstimate: labelEarning
            };
        });
        
        // Sort by plays descending
        artists.sort((a, b) => b.plays - a.plays);
        
        return artists.slice(0, n);
    }

    /**
     * Get top N albums sorted by play count
     */
    getTopAlbums(n = 10) {
        const albums = this.albumNames.map((albumKey, index) => {
            // Split the key to get album name and artist
            const [albumName] = albumKey.split('|||');
            const artistName = this.albumArtists[index];
            
            // Calculate album plays (total track plays divided by number of tracks on album)
            const trackCount = this.albumTrackCounts[index] || 1; // Default to 1 to avoid division by zero
            const albumPlays = Math.round(this.albumPlaycounts[index] / trackCount);
            
            // Calculate earnings based on total track plays (not album plays)
            const earningsUSD = this.albumPlaycounts[index] * this.payPerListen;
            
            // Calculate label earnings and artist share (20% of label)
            const labelEarning = this.currency === 'GBP' ? earningsUSD / this.exchangeRate : earningsUSD;
            
            return {
                albumName,
                artistName,
                plays: albumPlays,
                trackCount: trackCount,
                totalTrackPlays: this.albumPlaycounts[index],
                estimate: labelEarning * this.artistShareOfStreaming,
                labelEstimate: labelEarning
            };
        });
        
        // Filter to only include actual albums (minimum 8 tracks)
        const actualAlbums = albums.filter(album => album.trackCount >= 8);
        
        // Sort by album plays descending
        actualAlbums.sort((a, b) => b.plays - a.plays);
        
        return actualAlbums.slice(0, n);
    }

    /**
     * Get yearly streaming data for top N artists
     */
    getTopArtistsYearlyData(n = 10) {
        const topArtists = this.getTopArtists(n);
        const years = [];
        
        // Get all years in range
        for (let year = this.earliestYear; year <= this.latestYear; year++) {
            years.push(year);
        }
        
        // Build datasets for each artist
        const datasets = topArtists.map(artist => {
            const data = years.map(year => {
                return this.artistYearlyData[artist.name]?.[year] || 0;
            });
            
            return {
                label: artist.name,
                data: data
            };
        });
        
        return {
            years: years,
            datasets: datasets
        };
    }

    /**
     * Calculate album purchase alternative based on threshold
     */
    calculateAlbumPurchaseAlternative(threshold = null) {
        if (threshold === null) {
            threshold = this.albumPurchaseThreshold;
        }
        
        // Filter albums that have been played at least 'threshold' times
        const qualifyingAlbums = [];
        
        for (let i = 0; i < this.albumNames.length; i++) {
            const trackCount = this.albumTrackCounts[i] || 1;
            const albumPlays = Math.round(this.albumPlaycounts[i] / trackCount);
            
            // Only include actual albums (8+ tracks) that meet the threshold
            if (trackCount >= 8 && albumPlays >= threshold) {
                const [albumName] = this.albumNames[i].split('|||');
                const artistName = this.albumArtists[i];
                
                qualifyingAlbums.push({
                    albumName,
                    artistName,
                    plays: albumPlays,
                    totalTrackPlays: this.albumPlaycounts[i]
                });
            }
        }
        
        const albumCount = qualifyingAlbums.length;
        const albumPrice = this.currency === 'GBP' ? this.albumPriceGBP : this.albumPriceUSD;
        const totalCost = albumCount * albumPrice;
        const artistEarnings = totalCost * this.artistShareOfAlbum;
        
        return {
            albumCount,
            totalCost,
            artistEarnings,
            threshold,
            albums: qualifyingAlbums
        };
    }

    /**
     * Calculate and output statistics (mirrors C# CalculateCounts method)
     */
    calculateCounts() {
        let output = '';
        
        // Reset counts before calculating
        this.mostPlayedArtistCount = 0;
        this.secondMostPlayedArtistCount = 0;
        this.thirdMostPlayedArtistCount = 0;
        
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
        
        // Calculate Spotify payments using detected or default years
        const startYear = this.earliestYear || 2009;
        const endYear = this.latestYear || new Date().getFullYear();
        const spotifyPayments = this.calculateSpotifyPayments(startYear, endYear);
        
        // Calculate top artist payments (label and artist share)
        const topArtistUSD = this.mostPlayedArtistCount * this.payPerListen;
        const topArtistLabel = this.currency === 'GBP' ? topArtistUSD / this.exchangeRate : topArtistUSD;
        const topArtistEarnings = topArtistLabel * this.artistShareOfStreaming;
        
        // Calculate total artist earnings across all streams
        const totalArtistEarningsUSD = validListens * this.payPerListen * this.artistShareOfStreaming;
        const totalArtistEarnings = this.currency === 'GBP' ? totalArtistEarningsUSD / this.exchangeRate : totalArtistEarningsUSD;
        
        // Store summary data for UI display
        this.summaryStats = {
            totalListens: this.listens.length,
            validListens: validListens,
            years: spotifyPayments.years,
            artistCount: this.artistNames.length,
            spotifyTotal: spotifyPayments.totalPaid,
            topArtist: this.mostPlayedArtist,
            topArtistPlays: this.mostPlayedArtistCount,
            topArtistEarnings: topArtistEarnings,
            topArtistLabel: topArtistLabel,
            totalArtistEarnings: totalArtistEarnings
        };
        
        // Output money to labels and artists
        const currency = this.getCurrencySymbol();
        const labelEstimate = this.currency === 'GBP' ? (validListens * this.payPerListen) / this.exchangeRate : validListens * this.payPerListen;
        const artistEstimate = labelEstimate * this.artistShareOfStreaming;
        
        output += `=== STREAMING REVENUE ===\n`;
        output += `Money to labels over ${validListens} listens:\n`;
        output += `  ${currency}${(this.payPerListen / (this.currency === 'GBP' ? this.exchangeRate : 1)).toFixed(4)} per listen: ${currency}${labelEstimate.toFixed(2)}\n`;
        output += `\nMoney to artists (20% of label revenue):\n`;
        output += `  ${currency}${artistEstimate.toFixed(2)}\n\n`;
        
        console.log(`Money to labels over ${validListens} listens: ${currency}${labelEstimate.toFixed(2)}`);
        console.log(`Money to artists over ${validListens} listens: ${currency}${artistEstimate.toFixed(2)}`);
        
        // Output top artists (both label and artist earnings)
        const mostPlayedLabelLowUSD = this.mostPlayedArtistCount * this.payPerListenLow;
        const mostPlayedLabelHighUSD = this.mostPlayedArtistCount * this.payPerListenHigh;
        const mostPlayedLabelLow = this.currency === 'GBP' ? mostPlayedLabelLowUSD / this.exchangeRate : mostPlayedLabelLowUSD;
        const mostPlayedLabelHigh = this.currency === 'GBP' ? mostPlayedLabelHighUSD / this.exchangeRate : mostPlayedLabelHighUSD;
        const mostPlayedLow = mostPlayedLabelLow * this.artistShareOfStreaming;
        const mostPlayedHigh = mostPlayedLabelHigh * this.artistShareOfStreaming;
        output += `Most played artist at ${this.mostPlayedArtistCount} plays: ${this.mostPlayedArtist}\n`;
        output += `  Label earned: ${currency}${mostPlayedLabelLow.toFixed(2)} - ${currency}${mostPlayedLabelHigh.toFixed(2)}\n`;
        output += `  Artist earned (20%): ${currency}${mostPlayedLow.toFixed(2)} - ${currency}${mostPlayedHigh.toFixed(2)}\n`;
        console.log(`Most played artist at ${this.mostPlayedArtistCount} plays: ${this.mostPlayedArtist}, artist earned ${currency}${mostPlayedLow.toFixed(2)} - ${currency}${mostPlayedHigh.toFixed(2)}`);
        
        const secondPlayedLabelLowUSD = this.secondMostPlayedArtistCount * this.payPerListenLow;
        const secondPlayedLabelHighUSD = this.secondMostPlayedArtistCount * this.payPerListenHigh;
        const secondPlayedLabelLow = this.currency === 'GBP' ? secondPlayedLabelLowUSD / this.exchangeRate : secondPlayedLabelLowUSD;
        const secondPlayedLabelHigh = this.currency === 'GBP' ? secondPlayedLabelHighUSD / this.exchangeRate : secondPlayedLabelHighUSD;
        const secondPlayedLow = secondPlayedLabelLow * this.artistShareOfStreaming;
        const secondPlayedHigh = secondPlayedLabelHigh * this.artistShareOfStreaming;
        output += `Second most played artist at ${this.secondMostPlayedArtistCount} plays: ${this.secondMostPlayedArtist}\n`;
        output += `  Label earned: ${currency}${secondPlayedLabelLow.toFixed(2)} - ${currency}${secondPlayedLabelHigh.toFixed(2)}\n`;
        output += `  Artist earned (20%): ${currency}${secondPlayedLow.toFixed(2)} - ${currency}${secondPlayedHigh.toFixed(2)}\n`;
        console.log(`Second most played artist at ${this.secondMostPlayedArtistCount} plays: ${this.secondMostPlayedArtist}, artist earned ${currency}${secondPlayedLow.toFixed(2)} - ${currency}${secondPlayedHigh.toFixed(2)}`);
        
        const thirdPlayedLabelLowUSD = this.thirdMostPlayedArtistCount * this.payPerListenLow;
        const thirdPlayedLabelHighUSD = this.thirdMostPlayedArtistCount * this.payPerListenHigh;
        const thirdPlayedLabelLow = this.currency === 'GBP' ? thirdPlayedLabelLowUSD / this.exchangeRate : thirdPlayedLabelLowUSD;
        const thirdPlayedLabelHigh = this.currency === 'GBP' ? thirdPlayedLabelHighUSD / this.exchangeRate : thirdPlayedLabelHighUSD;
        const thirdPlayedLow = thirdPlayedLabelLow * this.artistShareOfStreaming;
        const thirdPlayedHigh = thirdPlayedLabelHigh * this.artistShareOfStreaming;
        output += `Third most played artist at ${this.thirdMostPlayedArtistCount} plays: ${this.thirdMostPlayedArtist}\n`;
        output += `  Label earned: ${currency}${thirdPlayedLabelLow.toFixed(2)} - ${currency}${thirdPlayedLabelHigh.toFixed(2)}\n`;
        output += `  Artist earned (20%): ${currency}${thirdPlayedLow.toFixed(2)} - ${currency}${thirdPlayedHigh.toFixed(2)}\n\n`;
        console.log(`Third most played artist at ${this.thirdMostPlayedArtistCount} plays: ${this.thirdMostPlayedArtist}, artist earned ${currency}${thirdPlayedLow.toFixed(2)} - ${currency}${thirdPlayedHigh.toFixed(2)}`);
        
        // Average listens per artist
        const averageListens = validListens / this.artistNames.length;
        const avgLabelLowUSD = averageListens * this.payPerListenLow;
        const avgLabelHighUSD = averageListens * this.payPerListenHigh;
        const avgLabelLow = this.currency === 'GBP' ? avgLabelLowUSD / this.exchangeRate : avgLabelLowUSD;
        const avgLabelHigh = this.currency === 'GBP' ? avgLabelHighUSD / this.exchangeRate : avgLabelHighUSD;
        const avgLow = avgLabelLow * this.artistShareOfStreaming;
        const avgHigh = avgLabelHigh * this.artistShareOfStreaming;
        output += `Average listens across ${this.artistNames.length} artists: ${averageListens.toFixed(2)}\n`;
        output += `  Average label earnings: ${currency}${avgLabelLow.toFixed(2)} - ${currency}${avgLabelHigh.toFixed(2)}\n`;
        output += `  Average artist earnings (20%): ${currency}${avgLow.toFixed(2)} - ${currency}${avgHigh.toFixed(2)}\n\n`;
        console.log(`Average listens across ${this.artistNames.length} artists: ${averageListens.toFixed(2)}, average artist earnings ${currency}${avgLow.toFixed(2)} - ${currency}${avgHigh.toFixed(2)}`);
        
        // Calculate realistic Spotify payments based on historical pricing
        // Determine subscription period from data (2009-2025 based on file names)
        const convertedTotal = this.convertCurrency(spotifyPayments.totalPaid);
        
        output += `\n=== SPOTIFY SUBSCRIPTION COST (Historical Pricing) ===\n`;
        output += `Period: 2009 - 2025 (${spotifyPayments.years} years)\n`;
        output += `Total paid to Spotify: ${currency}${convertedTotal.toFixed(2)}\n`;
        output += `\nBreakdown by period:\n`;
        
        // Group breakdown by pricing periods
        let currentPrice = null;
        let periodStart = null;
        let periodTotal = 0;
        
        for (const item of spotifyPayments.breakdown) {
            if (currentPrice !== item.monthlyPrice) {
                if (currentPrice !== null) {
                    const convertedPrice = this.convertCurrency(currentPrice);
                    const convertedTotal = this.convertCurrency(periodTotal);
                    output += `${periodStart}-${item.year - 1}: ${currency}${convertedPrice.toFixed(2)}/month = ${currency}${convertedTotal.toFixed(2)}\n`;
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
            const convertedPrice = this.convertCurrency(currentPrice);
            const convertedTotal = this.convertCurrency(periodTotal);
            output += `${periodStart}-${lastYear}: ${currency}${convertedPrice.toFixed(2)}/month = ${currency}${convertedTotal.toFixed(2)}\n`;
        }
        
        console.log(`\nPaid Spotify roughly ${currency}${convertedTotal.toFixed(2)} over ${spotifyPayments.years} years (2009-2025) using historical pricing data`);
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
        
        // Load currency preference
        const savedCurrency = localStorage.getItem('spotify_currency');
        if (savedCurrency) {
            this.dataReader.currency = savedCurrency;
        }
        
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.processBtn = document.getElementById('processBtn');
        this.results = document.getElementById('results');
        this.loading = document.getElementById('loading');
        this.progressText = document.getElementById('progressText');
        
        this.initializeEventListeners();
        this.checkForStoredData();
        this.createCurrencyToggle();
    }

    /**
     * Create currency toggle button
     */
    createCurrencyToggle() {
        // Check if toggle already exists
        if (document.getElementById('currencyToggle')) {
            return;
        }
        
        const toggleContainer = document.createElement('div');
        toggleContainer.id = 'currencyToggle';
        toggleContainer.className = 'fixed top-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200';
        
        toggleContainer.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-gray-700">Currency:</span>
                <div class="flex gap-2">
                    <button id="currencyGBP" class="currency-btn px-3 py-1 rounded text-sm font-semibold transition-colors ${this.dataReader.currency === 'GBP' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                        £ GBP
                    </button>
                    <button id="currencyUSD" class="currency-btn px-3 py-1 rounded text-sm font-semibold transition-colors ${this.dataReader.currency === 'USD' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                        $ USD
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(toggleContainer);
        
        // Add event listeners
        document.getElementById('currencyGBP').addEventListener('click', () => this.switchCurrency('GBP'));
        document.getElementById('currencyUSD').addEventListener('click', () => this.switchCurrency('USD'));
    }

    /**
     * Switch currency and refresh display
     */
    switchCurrency(currency) {
        this.dataReader.setCurrency(currency);
        
        // Update button states
        const gbpBtn = document.getElementById('currencyGBP');
        const usdBtn = document.getElementById('currencyUSD');
        
        if (currency === 'GBP') {
            gbpBtn.className = 'currency-btn px-3 py-1 rounded text-sm font-semibold transition-colors bg-blue-600 text-white';
            usdBtn.className = 'currency-btn px-3 py-1 rounded text-sm font-semibold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300';
        } else {
            usdBtn.className = 'currency-btn px-3 py-1 rounded text-sm font-semibold transition-colors bg-blue-600 text-white';
            gbpBtn.className = 'currency-btn px-3 py-1 rounded text-sm font-semibold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300';
        }
        
        // Refresh display if data exists
        if (this.dataReader.artistNames.length > 0) {
            this.dataReader.calculateCounts();
            this.displaySummaryHero();
            this.displayAlbumPurchaseAlternative();
            this.displayTopArtistsTable();
            this.displayTopAlbumsTable();
            this.displayStreamingChart();
        }
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
                this.dataReader.calculateCounts();
                this.results.classList.remove('hidden');
                
                // Display summary hero
                this.displaySummaryHero();
                
                // Display album purchase alternative
                this.displayAlbumPurchaseAlternative();
                
                // Display top artists table
                this.displayTopArtistsTable();
                
                // Display top albums table
                this.displayTopAlbumsTable();
                
                // Display streaming chart
                this.displayStreamingChart();
                
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
            
            // Destroy chart if it exists
            if (this.streamingChart) {
                this.streamingChart.destroy();
                this.streamingChart = null;
            }
            
            // Clear UI
            this.results.classList.add('hidden');
            const hero = document.getElementById('summaryHero');
            if (hero) hero.remove();
            const albumPurchaseContainer = document.getElementById('albumPurchaseAlternative');
            if (albumPurchaseContainer) albumPurchaseContainer.remove();
            const assumptionsInfo = document.getElementById('assumptionsInfo');
            if (assumptionsInfo) assumptionsInfo.remove();
            const artistsTable = document.getElementById('topArtistsTable');
            if (artistsTable) artistsTable.remove();
            const albumsTable = document.getElementById('topAlbumsTable');
            if (albumsTable) albumsTable.remove();
            const chartContainer = document.getElementById('streamingChartContainer');
            if (chartContainer) chartContainer.remove();
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
            this.results.classList.remove('hidden');
            
            // Display summary hero
            this.displaySummaryHero();
            
            // Display album purchase alternative
            this.displayAlbumPurchaseAlternative();
            
            // Create top 10 artists table
            this.displayTopArtistsTable();
            
            // Create top 10 albums table
            this.displayTopAlbumsTable();
            
            // Create streaming chart
            this.displayStreamingChart();
            
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
        
        this.results.appendChild(downloadBtn);
    }

    displayTopArtistsTable() {
        const topArtists = this.dataReader.getTopArtists(10);
        const currencySymbol = this.dataReader.getCurrencySymbol();
        
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
                            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Artist Earnings (20%)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${topArtists.map((artist, index) => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}</td>
                                <td class="px-6 py-4 text-sm font-medium text-gray-900">${this.escapeHtml(artist.name)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">${artist.plays.toLocaleString()}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">${currencySymbol}${artist.estimate.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        // Insert table in results
        this.results.appendChild(tableContainer);
    }

    displayTopAlbumsTable(limit = null) {
        // Get the limit from the stored preference or use default
        if (limit === null) {
            limit = parseInt(localStorage.getItem('spotify_albums_limit') || '10');
        }
        
        const topAlbums = this.dataReader.getTopAlbums(limit);
        const currencySymbol = this.dataReader.getCurrencySymbol();
        const albumPrice = this.dataReader.currency === 'GBP' ? this.dataReader.albumPriceGBP : this.dataReader.albumPriceUSD;
        
        // Check if table already exists and remove it
        const existingTable = document.getElementById('topAlbumsTable');
        if (existingTable) {
            existingTable.remove();
        }
        
        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.id = 'topAlbumsTable';
        tableContainer.className = 'mt-6';
        
        tableContainer.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-semibold text-gray-700">Top Albums - Streaming vs Purchase Earnings</h3>
                <div class="flex items-center gap-2">
                    <label for="albumsLimitSelect" class="text-sm font-medium text-gray-700">Show:</label>
                    <select id="albumsLimitSelect" class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="10" ${limit === 10 ? 'selected' : ''}>10</option>
                        <option value="20" ${limit === 20 ? 'selected' : ''}>20</option>
                        <option value="50" ${limit === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${limit === 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b" rowspan="2">#</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b" rowspan="2">Album</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b" rowspan="2">Artist</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b" rowspan="2">Album Plays</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider border-b border-l border-r" colspan="3">Earned from Streams</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider border-b border-r" colspan="1">vs Album Purchase</th>
                        </tr>
                        <tr>
                            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-l">Track Streams</th>
                            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Label</th>
                            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r">Artist (20%)</th>
                            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r">Artist Multiple</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${topAlbums.map((album, index) => {
                            // Calculate streaming earnings based on total track streams
                            const labelStreaming = album.totalTrackPlays * this.dataReader.payPerListen;
                            const artistStreaming = labelStreaming * this.dataReader.artistShareOfStreaming;
                            
                            // Calculate purchase earnings (if user bought album once)
                            const artistPurchase = albumPrice * this.dataReader.artistShareOfAlbum;
                            
                            // Calculate how many times more the artist would have earned from purchase
                            const multiple = artistPurchase / this.dataReader.convertCurrency(artistStreaming);
                            
                            // Convert to selected currency
                            const labelStreamingConverted = this.dataReader.convertCurrency(labelStreaming);
                            const artistStreamingConverted = this.dataReader.convertCurrency(artistStreaming);
                            
                            return `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}</td>
                                <td class="px-4 py-4 text-sm font-medium text-gray-900">${this.escapeHtml(album.albumName)}</td>
                                <td class="px-4 py-4 text-sm text-gray-700">${this.escapeHtml(album.artistName)}</td>
                                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right">${album.plays.toLocaleString()}</td>
                                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right border-l bg-blue-50">${album.totalTrackPlays.toLocaleString()}</td>
                                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right bg-blue-50">${currencySymbol}${labelStreamingConverted.toFixed(2)}</td>
                                <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-blue-700 text-right border-r bg-blue-50">${currencySymbol}${artistStreamingConverted.toFixed(2)}</td>
                                <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold ${multiple >= 1 ? 'text-green-700' : 'text-red-700'} text-right border-r bg-green-50">${multiple >= 1 ? multiple.toFixed(1) + 'x more' : (1/multiple).toFixed(1) + 'x less'}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <p class="mt-3 text-xs text-gray-500 italic">
                * Purchase comparison assumes ${this.dataReader.currency === 'GBP' ? '£10' : '$12.99'} per album with 80% to label and 20% to artist
            </p>
        `;
        
        // Insert table after the artists table or in results
        const artistsTable = document.getElementById('topArtistsTable');
        if (artistsTable) {
            artistsTable.parentElement.insertBefore(tableContainer, artistsTable.nextSibling);
        } else {
            this.results.appendChild(tableContainer);
        }
        
        // Add event listener for the dropdown
        const albumsLimitSelect = document.getElementById('albumsLimitSelect');
        if (albumsLimitSelect) {
            albumsLimitSelect.addEventListener('change', (e) => {
                const newLimit = parseInt(e.target.value);
                localStorage.setItem('spotify_albums_limit', newLimit);
                this.displayTopAlbumsTable(newLimit);
            });
        }
    }

    /**
     * Display streaming pattern chart for top 10 artists
     */
    displayStreamingChart() {
        const chartData = this.dataReader.getTopArtistsYearlyData(10);
        
        // Check if chart already exists and remove it
        const existingChart = document.getElementById('streamingChartContainer');
        if (existingChart) {
            existingChart.remove();
        }
        
        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.id = 'streamingChartContainer';
        chartContainer.className = 'mt-6 bg-white p-6 rounded-lg border border-gray-200';
        
        chartContainer.innerHTML = `
            <h3 class="text-xl font-semibold mb-4 text-gray-700">Top 10 Artists - Streaming Patterns Over Time</h3>
            <div class="relative" style="height: 400px;">
                <canvas id="streamingChart"></canvas>
            </div>
        `;
        
        // Insert chart after the albums table or in results
        const albumsTable = document.getElementById('topAlbumsTable');
        if (albumsTable) {
            albumsTable.parentElement.insertBefore(chartContainer, albumsTable.nextSibling);
        } else {
            this.results.appendChild(chartContainer);
        }
        
        // Create the chart
        const ctx = document.getElementById('streamingChart').getContext('2d');
        
        // Generate colors for each artist
        const colors = [
            'rgb(59, 130, 246)',   // blue
            'rgb(239, 68, 68)',    // red
            'rgb(34, 197, 94)',    // green
            'rgb(168, 85, 247)',   // purple
            'rgb(251, 146, 60)',   // orange
            'rgb(236, 72, 153)',   // pink
            'rgb(14, 165, 233)',   // sky
            'rgb(132, 204, 22)',   // lime
            'rgb(251, 191, 36)',   // amber
            'rgb(163, 163, 163)'   // gray
        ];
        
        const datasets = chartData.datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5
        }));
        
        this.streamingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.years,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' streams';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Streams',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
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
                        ${this.dataReader.getCurrencySymbol()}${this.dataReader.convertCurrency(stats.spotifyTotal).toFixed(2)}
                    </span>
                    since 2009.
                </p>
                
                <!-- Top Artist -->
                <p class="text-xl text-gray-700 leading-relaxed">
                    Your most played artist, <span class="inline-block bg-yellow-500 text-gray-900 font-bold px-3 py-1 rounded-lg text-xl mx-1">
                        ${this.escapeHtml(stats.topArtist)}
                    </span>, has earned approximately
                    <span class="inline-block bg-orange-500 text-white font-bold px-2 py-1 rounded-lg mx-1">
                        ${this.dataReader.getCurrencySymbol()}${stats.topArtistEarnings.toFixed(2)}
                    </span>
                    from your streams.
                </p>
                
                <!-- Total Artist Earnings -->
                <p class="text-xl text-gray-700 leading-relaxed">
                    Across all of your streams, artists have earned 
                    <span class="inline-block bg-purple-500 text-white font-bold px-3 py-1 rounded-lg text-2xl mx-1">
                        ${this.dataReader.getCurrencySymbol()}${stats.totalArtistEarnings.toFixed(2)}
                    </span>.
                </p>
            </div>
        `;
        
        // Insert hero at the top of results
        this.results.insertBefore(heroContainer, this.results.firstChild);
    }

    displayAlbumPurchaseAlternative() {
        // Check if container already exists and remove it
        const existingContainer = document.getElementById('albumPurchaseAlternative');
        if (existingContainer) {
            existingContainer.remove();
        }

        const data = this.dataReader.calculateAlbumPurchaseAlternative();
        
        // Create container
        const container = document.createElement('div');
        container.id = 'albumPurchaseAlternative';
        container.className = 'mb-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200';
        
        container.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Album Purchase Alternative</h2>
            
            <p class="text-xl text-gray-700 leading-relaxed mb-4">
                If you had bought every album you've listened to over 
                <span class="inline-block bg-purple-500 text-white font-bold px-3 py-1 rounded-lg text-2xl mx-1">
                    ${data.threshold}
                </span>
                times, you would own 
                <span class="inline-block bg-pink-500 text-white font-bold px-3 py-1 rounded-lg text-2xl mx-1">
                    ${data.albumCount}
                </span>
                albums, have spent 
                <span class="inline-block bg-red-500 text-white font-bold px-3 py-1 rounded-lg text-2xl mx-1">
                    ${this.dataReader.getCurrencySymbol()}${data.totalCost.toFixed(2)}
                </span>
                and paid artists 
                <span class="inline-block bg-orange-500 text-white font-bold px-3 py-1 rounded-lg text-2xl mx-1">
                    ${this.dataReader.getCurrencySymbol()}${data.artistEarnings.toFixed(2)}
                </span>.
            </p>
        `;
        
        // Insert after the hero
        const hero = document.getElementById('summaryHero');
        if (hero && hero.nextSibling) {
            this.results.insertBefore(container, hero.nextSibling);
        } else if (hero) {
            hero.after(container);
        } else {
            this.results.insertBefore(container, this.results.firstChild);
        }
        
        // Add assumptions information section
        this.displayAssumptions();
    }

    displayAssumptions() {
        // Check if container already exists and remove it
        const existingContainer = document.getElementById('assumptionsInfo');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create container
        const container = document.createElement('div');
        container.id = 'assumptionsInfo';
        container.className = 'mb-8 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-8 border border-gray-300';
        
        container.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Assumptions</h2>
            
            <div class="space-y-3 text-gray-700">
                <p class="text-base leading-relaxed">
                    <span class="font-semibold text-gray-800">Streaming payouts:</span> 
                    Spotify pays approximately <span class="font-bold text-blue-600">$0.004 per stream</span> to rights holders (labels)
                </p>
                
                <p class="text-base leading-relaxed">
                    <span class="font-semibold text-gray-800">Artist streaming revenue:</span> 
                    Artists receive approximately <span class="font-bold text-blue-600">20%</span> of streaming revenue from labels
                </p>
                
                <p class="text-base leading-relaxed">
                    <span class="font-semibold text-gray-800">Album purchase split:</span> 
                    Labels receive <span class="font-bold text-green-600">80%</span> of album purchase revenue, 
                    artists receive <span class="font-bold text-green-600">20%</span>
                </p>
                
                <p class="text-base leading-relaxed">
                    <span class="font-semibold text-gray-800">Album pricing:</span> 
                    Average album price is <span class="font-bold text-purple-600">£10.00 GBP</span> or <span class="font-bold text-purple-600">$12.99 USD</span>
                </p>
                
                <p class="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-300">
                    <em>Note: These are industry averages and can vary significantly based on contracts, distribution deals, and whether artists are independent or signed to labels.</em>
                </p>
            </div>
        `;
        
        // Insert after the album purchase alternative
        const albumPurchase = document.getElementById('albumPurchaseAlternative');
        if (albumPurchase && albumPurchase.nextSibling) {
            this.results.insertBefore(container, albumPurchase.nextSibling);
        } else if (albumPurchase) {
            albumPurchase.after(container);
        } else {
            this.results.appendChild(container);
        }
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
