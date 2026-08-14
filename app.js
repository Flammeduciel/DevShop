// ========================================
// 1. VARIABLES GLOBALES
// ========================================

const API_URL = 'https://fakestoreapi.com/products';
let products = [];
let filteredProducts = [];
let cart = [];
let categories = [];
let currentSort = 'default';
let maxPrice = 1000;

// Éléments DOM
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const productsGrid = document.getElementById('products-grid');
const categoryFilters = document.getElementById('category-filters');
const searchInput = document.getElementById('search-input');
const cartToggle = document.getElementById('cart-toggle');
const cartDrawer = document.getElementById('cart-drawer');
const cartItems = document.getElementById('cart-items');
const cartEmptyMessage = document.getElementById('cart-empty-message');
const cartCount = document.getElementById('cart-count');
const mobileCartCount = document.getElementById('mobile-cart-count');
const cartTotal = document.getElementById('cart-total');
const checkoutButton = document.querySelector('.checkout-button');
const cartFooter = document.querySelector('.cart-footer');
const filterSidebar = document.getElementById('filter-sidebar');
const closeFiltersBtn = document.getElementById('close-filters');
const priceRange = document.getElementById('price-range');
const minPriceDisplay = document.getElementById('min-price');
const maxPriceDisplay = document.getElementById('max-price');
const productCount = document.getElementById('product-count');
const mobileNav = document.getElementById('mobile-nav');
const sidebarSearchInput = document.getElementById('sidebar-search-input');

// ========================================
// 2. FONCTIONS D'INITIALISATION
// ========================================

/**
 * Initialise l'application
 */
async function init() {
    // Charger le panier depuis localStorage
    loadCartFromLocalStorage();
    
    // Charger les produits depuis l'API
    await fetchProducts();
    
    // Configurer les écouteurs d'événements
    setupEventListeners();
    
    // Mettre à jour l'interface
    updateCartDisplay();
}

/**
 * Configure tous les écouteurs d'événements
 */
function setupEventListeners() {
    // Recherche en temps réel (barre principale et tiroir)
    searchInput.addEventListener('input', debounce((e) => {
        handleSearch();
        if (sidebarSearchInput) {
            sidebarSearchInput.value = e.target.value;
        }
    }, 300));
    
    if (sidebarSearchInput) {
        sidebarSearchInput.addEventListener('input', debounce((e) => {
            searchInput.value = e.target.value;
            handleSearch();
        }, 300));
    }
    
    // Toggle panier
    cartToggle.addEventListener('click', toggleCart);
    
    // Toggle sidebar via mobile nav
    closeFiltersBtn.addEventListener('click', closeSidebarMenu);
    
    // Filtre par prix
    priceRange.addEventListener('input', (e) => {
        handlePriceFilter();
        // Mettre à jour la variable CSS pour le dégradé du slider
        const progress = (e.target.value / e.target.max) * 100;
        document.documentElement.style.setProperty('--range-progress', `${progress}%`);
    });
    
    // Filtres de tri
    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        sortAndDisplayProducts();
    });
    
    // Fermer le panier avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCart();
            closeSidebarMenu();
        }
    });
    
    // Fermer le panier en cliquant à l'extérieur
    cartDrawer.addEventListener('click', (e) => {
        if (e.target === cartDrawer) {
            closeCart();
        }
    });
}

// ========================================
// 3. GESTION DE L'API
// ========================================

/**
 * Récupère les produits depuis l'API
 */
async function fetchProducts() {
    showLoader();
    hideError();
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        products = await response.json();
        
        // Extraire les catégories uniques
        extractCategories();
        
        // Déterminer le prix maximum
        maxPrice = Math.max(...products.map(p => p.price));
        maxPrice = Math.ceil(maxPrice / 10) * 10; // Arrondir à la dizaine supérieure
        
        // Mettre à jour l'affichage des prix
        minPriceDisplay.textContent = '0€';
        maxPriceDisplay.textContent = `${maxPrice}€`;
        priceRange.max = maxPrice;
        priceRange.value = maxPrice;
        
        // Initialiser le dégradé du slider
        document.documentElement.style.setProperty('--range-progress', '100%');
        
        // Créer les boutons de catégorie
        createCategoryButtons();
        
        // Appliquer les filtres initiaux
        filteredProducts = [...products];
        sortAndDisplayProducts();
        
    } catch (error) {
        console.error('Erreur lors de la récupération des produits:', error);
        showError('Impossible de charger les produits. Vérifiez votre connexion internet.');
    } finally {
        hideLoader();
    }
}

/**
 * Extrait les catégories uniques des produits
 */
function extractCategories() {
    categories = ['Tous', ...new Set(products.map(p => p.category))];
}

/**
 * Crée les boutons de catégorie dynamiquement
 */
function createCategoryButtons() {
    categoryFilters.innerHTML = '';
    
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-button';
        button.dataset.category = category;
        button.innerHTML = `
            <i class="fas fa-tag"></i>
            <span>${category}</span>
        `;
        
        if (category === 'Tous') {
            button.classList.add('active');
        }
        
        button.addEventListener('click', () => {
            // Retirer la classe active de tous les boutons
            categoryFilters.querySelectorAll('.category-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Ajouter la classe active au bouton cliqué
            button.classList.add('active');
            
            // Filtrer les produits
            filterByCategory(category);
        });
        
        categoryFilters.appendChild(button);
    });
}

// ========================================
// 4. GESTION DES PRODUITS
// ========================================

/**
 * Affiche les produits filtrés et triés
 */
function sortAndDisplayProducts() {
    let sortedProducts = [...filteredProducts];
    
    switch (currentSort) {
        case 'price-asc':
            sortedProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            sortedProducts.sort((a, b) => b.price - a.price);
            break;
        case 'rating':
            sortedProducts.sort((a, b) => b.rating.rate - a.rating.rate);
            break;
        default:
            // Par défaut, on garde l'ordre original ou par ID
            sortedProducts.sort((a, b) => a.id - b.id);
    }
    
    displayProducts(sortedProducts);
}

/**
 * Affiche les produits dans la grille
 * @param {Array} productsToDisplay - Produits à afficher
 */
function displayProducts(productsToDisplay) {
    if (productsToDisplay.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <p>Aucun produit trouvé.</p>
                <button onclick="resetFilters()" class="primary-button">Réinitialiser les filtres</button>
            </div>
        `;
    } else {
        productsGrid.innerHTML = productsToDisplay.map(product => createProductCard(product)).join('');
    }
    
    // Mettre à jour le compteur de produits
    productCount.textContent = `${productsToDisplay.length} produit(s)`;
}

/**
 * Crée une carte de produit
 * @param {Object} product - Produit à afficher
 * @returns {string} HTML de la carte
 */
function createProductCard(product) {
    const categoryIcons = {
        "electronics": "fa-tv",
        "jewelery": "fa-gem",
        "men's clothing": "fa-tshirt",
        "women's clothing": "fa-dress"
    };
    
    const iconClass = categoryIcons[product.category.toLowerCase()] || "fa-tag";
    const rating = Math.round(product.rating?.rate || 0);
    const ratingStars = generateRatingStars(rating);
    
    return `
        <article class="product-card" data-id="${product.id}">
            <div class="product-media">
                ${product.rating?.rate >= 4.5 ? '<span class="product-badge">Top</span>' : ''}
                <div class="product-rating">
                    <i class="fas fa-star"></i>
                    <span>${rating}</span>
                </div>
                <img src="${product.image}" alt="${product.title}" loading="lazy">
            </div>
            <div class="product-info">
                <span class="product-category">
                    <i class="fas ${iconClass}"></i> ${product.category}
                </span>
                <h3 class="product-title">${product.title}</h3>
                <p class="product-description">${truncateString(product.description, 100)}</p>
                <div class="product-footer">
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <button class="add-to-cart" onclick="addToCart(${product.id})" aria-label="Ajouter au panier">
                        <i class="fas fa-shopping-cart"></i> Ajouter
                    </button>
                </div>
            </div>
        </article>
    `;
}

/**
 * Génère des étoiles pour la notation
 * @param {number} rating - Note sur 5
 * @returns {string} HTML des étoiles
 */
function generateRatingStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    }
    return stars;
}

/**
 * Formate le prix
 * @param {number} price - Prix à formater
 * @returns {string} Prix formaté
 */
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

/**
 * Tronque une chaîne de caractères
 * @param {string} str - Chaîne à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Chaîne tronquée
 */
function truncateString(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// ========================================
// 5. FILTRES
// ========================================

/**
 * Applique tous les filtres (catégorie, prix, recherche)
 */
function applyAllFilters() {
    const activeCategory = document.querySelector('.category-button.active')?.dataset.category || 'Tous';
    const maxPriceValue = parseFloat(priceRange.value);
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    filteredProducts = products.filter(p => {
        // Filtre par catégorie
        if (activeCategory !== 'Tous' && p.category !== activeCategory) return false;
        
        // Filtre par prix
        if (p.price > maxPriceValue) return false;
        
        // Filtre par recherche
        if (searchTerm && !p.title.toLowerCase().includes(searchTerm) && 
                       !p.description.toLowerCase().includes(searchTerm) &&
                       !p.category.toLowerCase().includes(searchTerm)) return false;
        
        return true;
    });
    
    sortAndDisplayProducts();
}

/**
 * Filtre les produits par catégorie
 * @param {string} category - Catégorie à filtrer
 */
function filterByCategory(category) {
    applyAllFilters();
}

/**
 * Gère le filtre de prix
 */
function handlePriceFilter() {
    applyAllFilters();
}

/**
 * Gère la recherche en temps réel
 */
function handleSearch() {
    applyAllFilters();
}

/**
 * Réinitialise tous les filtres
 */
function resetFilters() {
    // Réinitialiser la recherche
    searchInput.value = '';
    
    // Réinitialiser la catégorie
    categoryFilters.querySelectorAll('.category-button').forEach(btn => {
        btn.classList.remove('active');
    });
    categoryFilters.querySelector('.category-button[data-category="Tous"]').classList.add('active');
    
    // Réinitialiser le prix
    priceRange.value = maxPrice;
    
    // Réinitialiser le tri
    currentSort = 'default';
    updateSortButtons();
    
    // Appliquer tous les filtres (qui sont maintenant tous réinitialisés)
    applyAllFilters();
}



// ========================================
// 6. GESTION DU PANIER
// ========================================

/**
 * Ajoute un produit au panier
 * @param {number} productId - ID du produit
 */
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        console.error('Produit non trouvé:', productId);
        return;
    }
    
    // Vérifier si le produit est déjà dans le panier
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    // Sauvegarder dans localStorage
    saveCartToLocalStorage();
    
    // Mettre à jour l'interface
    updateCartDisplay();
    
    // Feedback visuel
    showAddToCartFeedback(product.title);
}

/**
 * Affiche une confirmation visuelle quand un produit est ajouté au panier
 * @param {string} productName - Nom du produit
 */
function showAddToCartFeedback(productName) {
    const notification = document.createElement('div');
    notification.className = 'add-to-cart-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${truncateString(productName, 20)} ajouté au panier!</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

/**
 * Met à jour l'affichage du panier
 */
function updateCartDisplay() {
    // Calculer le total d'articles
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Mettre à jour les compteurs
    cartCount.textContent = totalItems > 0 ? totalItems : '';
    mobileCartCount.textContent = totalItems > 0 ? totalItems : '';
    
    // Calculer le total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = formatPrice(total);
    
    // Mettre à jour les articles du panier
    updateCartItems();
    
    // Sauvegarder dans localStorage
    saveCartToLocalStorage();
}

/**
 * Met à jour la liste des articles dans le tiroir du panier
 */
function updateCartItems() {
    // Retirer uniquement les articles générés, sans détruire le message "panier vide"
    cartItems.querySelectorAll('.cart-item').forEach(el => el.remove());
    
    if (cart.length === 0) {
        cartEmptyMessage.style.display = 'flex';
        checkoutButton.disabled = true;
        checkoutButton.classList.add('disabled');
        cartFooter.classList.add('empty');
    } else {
        cartEmptyMessage.style.display = 'none';
        cartItems.insertAdjacentHTML('beforeend', cart.map(item => createCartItem(item)).join(''));
        checkoutButton.disabled = false;
        checkoutButton.classList.remove('disabled');
        cartFooter.classList.remove('empty');
    }
}

/**
 * Crée un élément d'article pour le panier
 * @param {Object} item - Article du panier
 * @returns {string} HTML de l'article
 */
function createCartItem(item) {
    return `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.title}" loading="lazy">
            </div>
            <div class="cart-item-info">
                <h4 class="cart-item-title">${item.title}</h4>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
                <div class="cart-item-quantity">
                    <button class="cart-quantity-button" onclick="updateQuantity(${item.id}, -1)" ${item.quantity <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-minus"></i>
                    </button>
                    <input 
                        type="number" 
                        value="${item.quantity}" 
                        min="1" 
                        onchange="updateQuantityFromInput(${item.id}, this.value)"
                        aria-label="Quantité de ${item.title}"
                    >
                    <button class="cart-quantity-button" onclick="updateQuantity(${item.id}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Supprimer ${item.title}">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
}

/**
 * Met à jour la quantité d'un article dans le panier
 * @param {number} productId - ID du produit
 * @param {number} change - Changement de quantité (+1 ou -1)
 */
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartDisplay();
        }
    }
}

/**
 * Met à jour la quantité depuis un champ input
 * @param {number} productId - ID du produit
 * @param {number} newQuantity - Nouvelle quantité
 */
function updateQuantityFromInput(productId, newQuantity) {
    const quantity = parseInt(newQuantity);
    
    if (isNaN(quantity) || quantity < 1) {
        return;
    }
    
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity = quantity;
        updateCartDisplay();
    }
}

/**
 * Supprime un article du panier
 * @param {number} productId - ID du produit
 */
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
}

/**
 * Vider le panier
 */
function clearCart() {
    cart = [];
    updateCartDisplay();
}

// ========================================
// 7. LOCALSTORAGE
// ========================================

/**
 * Sauvegarde le panier dans localStorage
 */
function saveCartToLocalStorage() {
    try {
        localStorage.setItem('devshop_cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du panier:', error);
    }
}

/**
 * Charge le panier depuis localStorage
 */
function loadCartFromLocalStorage() {
    try {
        const savedCart = localStorage.getItem('devshop_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du panier:', error);
        cart = [];
    }
}

// ========================================
// 8. TOGGLE PANIER & SIDEBAR
// ========================================

/**
 * Ouvre ou ferme le tiroir du panier
 */
function toggleCart() {
    if (cartDrawer.classList.contains('open')) {
        closeCart();
    } else {
        openCart();
    }
}

/**
 * Ouvre le tiroir du panier
 */
function openCart() {
    cartDrawer.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

/**
 * Ferme le tiroir du panier
 */
function closeCart() {
    cartDrawer.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

/**
 * Ouvre la sidebar des filtres
 */
function openFilters() {
    filterSidebar.classList.add('open');
    document.body.style.overflow = 'hidden';
}

/**
 * Ferme la sidebar des filtres
 */
function closeSidebarMenu() {
    filterSidebar.classList.remove('open');
    document.body.style.overflow = '';
}

/**
 * Toggle la sidebar des filtres
 */
function toggleSidebar() {
    if (filterSidebar.classList.contains('open')) {
        closeSidebarMenu();
    } else {
        openFilters();
    }
}

// ========================================
// 9. CHECKOUT
// ========================================

/**
 * Fonction de checkout (simulée)
 */
function checkout() {
    if (cart.length === 0) {
        alert('Votre panier est vide!');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Afficher une confirmation
    const confirmation = confirm(`Vous allez passer à la caisse pour un total de ${formatPrice(total)}. Continuer?`);
    
    if (confirmation) {
        alert('Commande passée avec succès! (Simulation)');
        clearCart();
        closeCart();
    }
}

// ========================================
// 10. LOADER & ERROR
// ========================================

/**
 * Affiche le loader
 */
function showLoader() {
    loader.classList.remove('hidden');
    loader.setAttribute('aria-hidden', 'false');
}

/**
 * Masque le loader
 */
function hideLoader() {
    loader.classList.add('hidden');
    loader.setAttribute('aria-hidden', 'true');
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur
 */
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.add('show');
    errorMessage.classList.remove('hidden');
    errorMessage.setAttribute('aria-hidden', 'false');
}

/**
 * Masque le message d'erreur
 */
function hideError() {
    errorMessage.classList.remove('show');
    errorMessage.classList.add('hidden');
    errorMessage.setAttribute('aria-hidden', 'true');
}

// ========================================
// 11. UTILITY FUNCTIONS
// ========================================

/**
 * Fonction de debounce pour optimiser les recherches
 * @param {Function} func - Fonction à debouncer
 * @param {number} wait - Délai en ms
 * @returns {Function} Fonction debounced
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========================================
// 12. INITIALISATION
// ========================================

// Démarrer l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', init);

// Gérer le changement de taille de la fenêtre pour les media queries
window.addEventListener('resize', () => {
    // Fermer la sidebar et le panier sur mobile quand on change d'orientation
    if (window.innerWidth > 919) {
        closeSidebarMenu();
        closeCart();
    }
});

// Exposer certaines fonctions au scope global pour les onclick dans le HTML
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.updateQuantityFromInput = updateQuantityFromInput;
window.openCart = openCart;
window.closeCart = closeCart;
window.openFilters = openFilters;
window.closeSidebar = closeSidebarMenu;
window.resetFilters = resetFilters;
window.clearCart = clearCart;
window.checkout = checkout;
window.fetchProducts = fetchProducts;