import { request } from './db.js';

console.log('Loaded: ' + (new Date()).toLocaleTimeString());

let _db;
let _columns;
let _cards;
let _filteredColumns;
let _filteredCards;
let _filter;
let _dragCard;

customElements.define('trl-search', class extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    connectedCallback() {
        const style = document.createElement('style');
        style.textContent = `
        #trl-search {
            align-self: center;
        }
        #trl-search-input {
            width: 200px;
            font-family: inherit;
            font-size: inherit;
        }
        `;
        const searchEle = document.createElement('div');
        searchEle.id = 'trl-search';
        const inputEle = document.createElement('input');
        inputEle.id = 'trl-search-input';
        inputEle.placeholder = 'Search...';
        inputEle.onkeyup = this.handleKeyUp;
        searchEle.appendChild(inputEle);
        this.shadow.innerHTML = '';
        this.shadow.appendChild(style);
        this.shadow.appendChild(searchEle);
    }

    handleKeyUp() {
        const inputEle = this.shadow.getElementById('trl-search-input');
        _filter = inputEle.value;
        _update();
    }
})

customElements.define('trl-columns', class extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['updated'] };

    attributeChangedCallback(name, oldValue, newValue) {
        switch(name) {
            case 'updated':
                if (newValue == 'true') {
                    this.updated();
                    this.setAttribute('updated', 'false');
                }
        }
    }

    updated() {
        if (_columns) {
            const style = document.createElement('style');
            style.textContent = `
            #trl-columns {
                padding: 1em;
            }
            `;
            const columnsEle = document.createElement('div');
            columnsEle.id = 'trl-columns';
            _filteredColumns.map(val => {
                let columnEle = document.createElement('trl-column');
                columnEle.setAttribute('column', val.id);
                columnsEle.appendChild(columnEle);
            });
            columnsEle.appendChild(document.createElement('trl-add-column'))
            this.shadow.innerHTML = '';
            this.shadow.appendChild(style);
            this.shadow.appendChild(columnsEle);
        }
    }
});

customElements.define('trl-column', class extends HTMLElement {
    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'open' });
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
    }

    connectedCallback() {
        this.updated();
    }

    updated() {
        this.columnId = this.getAttribute('column');
        if (this.columnId && _cards) {
            this.column = _columns.find(c => c.id == this.columnId);
            this.columnTitle = this.column.title;
            const style = document.createElement('style');
            style.textContent = `
            #trl-column {
                vertical-align: top;
                display: inline-block;
                width: 200px;
                border-right: 1px dashed gray;
                padding: 0.2em;
            }
            @media screen and (max-width: 480px) {
                #trl-column {
                    width: 100%;
                }
            }
            `;
            const columnEle = document.createElement('div');
            columnEle.id = `trl-column`;
            columnEle.ondragover = this.handleDragOver;
            columnEle.ondragleave = this.handleDragLeave;
            columnEle.ondrop = this.handleDrop;
            const titleEle = document.createElement('trl-column-title');
            titleEle.setAttribute('column', this.columnId);
            columnEle.appendChild(titleEle);
            const columnCards = _filteredCards.filter(c => c.columnId == this.columnId);
            columnCards.map(val => {
                let cardEle = document.createElement('trl-card');
                cardEle.setAttribute('card', val.id);
                cardEle.setAttribute('card-title', val.title);
                cardEle.setAttribute('card-description', val.description);
                columnEle.appendChild(cardEle);
            })
            const addCardEle = document.createElement('trl-add-card');
            addCardEle.setAttribute('column', this.columnId);
            columnEle.appendChild(addCardEle);
            this.shadow.innerHTML = '';
            this.shadow.appendChild(style);
            this.shadow.appendChild(columnEle);
        }
    }

    

    handleDragOver(e) {
        // some visual feedback for dragging
        if (_dragCard && _dragCard.columnId != this.columnId) {
            const columnEle = this.shadow.getElementById('trl-column');
            columnEle.style.backgroundColor = 'rgba(0,0,0,0.2)';
        }
        e.preventDefault();
    }

    handleDragLeave(e) {
        const columnEle = this.shadow.getElementById('trl-column');
        columnEle.style.backgroundColor = '';
        e.preventDefault();
    }
    
    handleDrop(e) {
        if (_dragCard && _dragCard.columnId != this.columnId) {
            _dragCard.columnId = this.columnId;
            setCard(_dragCard.id, _dragCard)
                .then(res => {
                    _update();
                })
                .catch(err => {
                    console.log(err);
                })
        }
        e.preventDefault();
    }
});

customElements.define('trl-column-title', class extends HTMLElement {
    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'open' });
        this.handleClick = this.handleClick.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.changing = false;
    }

    connectedCallback() {
        this.updated();
    }

    updated() {
        this.columnId = this.getAttribute('column');
        if (this.columnId && _columns) {
            this.column = _columns.find(c => c.id == this.columnId);
            const style = document.createElement('style');
            style.textContent = `
            #trl-column-title {
                display: inline-block;
                vertical-align: top;
                width: 80%;
                box-sizing: border-box;
                padding: 0.2em;
            }
            #trl-column-del {
                display: inline-block;
                vertical-align: top;
                width: 20%;
                box-sizing: border-box;
            }
            #trl-column-title-edit {
                display: none;
                width: 100%;
                box-sizing: border-box;
                padding: 0.2em;
                font-family: inherit;
                font-size: inherit;
            }
            `;
            const viewEle = document.createElement('div');
            viewEle.id = 'trl-column-title';
            viewEle.textContent = this.column.title;
            viewEle.onclick = this.handleClick;
            const delEle = document.createElement('button');
            delEle.id = 'trl-column-del';
            delEle.innerHTML = '&times;';
            delEle.onclick = this.handleDelete;
            const editEle = document.createElement('input');
            editEle.id = 'trl-column-title-edit';
            editEle.value = this.column.title;
            editEle.onblur = this.handleBlur;
            editEle.onchange = this.handleChange;
            
            this.shadow.innerHTML = '';
            this.shadow.appendChild(style);
            this.shadow.appendChild(viewEle);
            this.shadow.appendChild(delEle);
            this.shadow.appendChild(editEle);
        }
    }

    handleClick() {
        if (this.columnId) {
            this.shadow.getElementById('trl-column-title').style.display = 'none';
            this.shadow.getElementById('trl-column-del').style.display = 'none';
            const editEle = this.shadow.getElementById('trl-column-title-edit');
            editEle.style.display = 'block';
            editEle.focus();
            editEle.select();
            this.changing = true;
        }
    }

    handleBlur() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
        
    }

    handleChange() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
    }

    handleDelete() {
        delColumn(this.columnId)
            .then(res => {
                _update();
            })
            .catch(err => {
                console.log(err);
            })
    }

    changed() {
        const viewEle = this.shadow.getElementById('trl-column-title');
        const delEle = this.shadow.getElementById('trl-column-del');
        const editEle = this.shadow.getElementById('trl-column-title-edit');
        if (this.columnId) {
            viewEle.style.display = 'inline-block';
            delEle.style.display = 'inline-block';
            editEle.style.display = 'none';
            const newValue = editEle.value.trim();
            if (newValue != '' && newValue != this.column.title) {
                if (_columns.filter(c => c.title == newValue).length > 0) {
                    alert('That column title already exists.');
                    editEle.value = this.column.title;
                } else {
                    this.column.title = newValue;
                    setColumn(this.columnId, this.column)
                        .then(res => {
                            this.updated();
                        })
                        .catch(err => {
                            console.log(err);
                        });
                }
                
            }
        }
    }
});

customElements.define('trl-add-column', class extends HTMLElement {
    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'open' });
        this.handleClick = this.handleClick.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.changing = false;
    }

    connectedCallback() {
        const style = document.createElement('style');
        style.textContent = `
        #trl-add-column {
            vertical-align: top;
            display: inline-block;
            width: 200px;
            font-family: inherit;
            font-size: inherit;
            padding: 0.2em;
        }
        @media screen and (max-width: 480px) {
            #trl-add-column {
                width: 100%;
            }
        }
        #trl-add-column-edit {
            display: none;
            width: 100%;
            box-sizing: border-box;
            font-family: inherit;
            font-size: inherit;
        }
        #trl-add-column-btn {
            width: 100%;
            box-sizing: border-box;
            font-family: inherit;
            font-size: inherit;
        }
        `;
        const columnEle = document.createElement('div');
        columnEle.id = 'trl-add-column';
        const inputEle = document.createElement('input');
        inputEle.id = 'trl-add-column-edit';
        inputEle.onblur = this.handleBlur;
        inputEle.onchange = this.handleChange;
        const button = document.createElement('button');
        button.id = 'trl-add-column-btn'
        button.textContent = '+ Add a column';
        button.onclick = this.handleClick;
        columnEle.appendChild(inputEle);
        columnEle.appendChild(button);
        
        this.shadow.innerHTML = '';
        this.shadow.appendChild(style);
        this.shadow.appendChild(columnEle);
    }

    handleClick() {
        this.shadow.getElementById('trl-add-column-btn').style.display = 'none';
        const editEle = this.shadow.getElementById('trl-add-column-edit');
        editEle.style.display = 'block';
        editEle.focus();
        editEle.select();
        this.changing = true;
    }

    handleBlur() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
    }

    handleChange() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
    }

    changed() {
        const btnEle = this.shadow.getElementById('trl-add-column-btn');
        const editEle = this.shadow.getElementById('trl-add-column-edit');
        btnEle.style.display = 'block';
        editEle.style.display = 'none';
        const newValue = editEle.value.trim();
        if (newValue != '') {
            if (_columns.filter(c => c.title == newValue).length > 0) {
                alert('That column title already exists.');
                editEle.value = '';
            } else {
                addColumn({ title: newValue })
                    .then(res => {
                        _update();
                    })
                    .catch(err => {
                        console.log(err);
                    })
            }
        }
    }
});

customElements.define('trl-card', class extends HTMLElement {
    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'open' });
        this.handleDragStart = this.handleDragStart.bind(this);
    }

    connectedCallback() {
        this.updated();
    }

    updated() {
        this.cardId = this.getAttribute('card');
        if (this.cardId && _cards) {
            this.card = _cards.find(c => c.id == this.cardId);
            const style = document.createElement('style');
            style.textContent = `
            #trl-card {
                background-color: white;
                display: block;
                padding: 0.1em;
                border: 1px solid silver;
                border-radius: 3px;
                box-shadow: 1px 1px #111;
                margin-bottom: 0.5em;
            }
            `;
            const cardEle = document.createElement('div');
            cardEle.draggable = true;
            cardEle.ondragstart = this.handleDragStart;
            cardEle.id = `trl-card`;
            this.cardTitle = this.card.title;
            this.cardDescription = this.card.description;
            const titleEle = document.createElement('trl-card-title');
            titleEle.setAttribute('card', this.cardId);
            cardEle.appendChild(titleEle);
            const descriptionEle = document.createElement('trl-card-description');
            descriptionEle.setAttribute('card', this.cardId);
            cardEle.appendChild(descriptionEle);
            this.shadow.innerHTML = '';
            this.shadow.appendChild(style);
            this.shadow.appendChild(cardEle);
        }
    }
    
    handleDragStart() {
        _dragCard = this.card;
    }
});

customElements.define('trl-card-title', class extends HTMLElement {
    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'open' });
        this.handleClick = this.handleClick.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.changing = false;
    }

    connectedCallback() {
        this.updated();
    }

    updated() {
        this.cardId = this.getAttribute('card');
        if (this.cardId && _cards) {
            this.card = _cards.find(c =>c.id == this.cardId);
            const style = document.createElement('style');
            style.textContent = `
            #trl-card-title {
                display: inline-block;
                width: 85%;
                box-sizing: border-box;
                border-bottom: 1px solid #111;
            }
            #trl-card-del {
                display: inline-block;
                vertical-align: top;
                width: 15%;
                box-sizing: border-box;
            }
            #trl-card-title-edit {
                display: none;
                width: 100%;
                box-sizing: border-box;
                font-family: inherit;
                font-size: inherit;
            }
            `;
            const viewEle = document.createElement('div');
            viewEle.id = 'trl-card-title';
            viewEle.textContent = this.card.title;
            viewEle.onclick = this.handleClick;
            const delEle = document.createElement('button');
            delEle.id = 'trl-card-del';
            delEle.innerHTML = '&times;';
            delEle.onclick = this.handleDelete;
            const editEle = document.createElement('input');
            editEle.id = 'trl-card-title-edit';
            editEle.value = this.card.title;
            editEle.onblur = this.handleBlur;
            editEle.onchange = this.handleChange;
            this.shadow.innerHTML = '';
            this.shadow.appendChild(style);
            this.shadow.appendChild(viewEle);
            this.shadow.appendChild(delEle);
            this.shadow.appendChild(editEle);
        }
    }

    handleClick() {
        if (this.cardId) {
            this.shadow.getElementById('trl-card-title').style.display = 'none';
            this.shadow.getElementById('trl-card-del').style.display = 'none';
            const editEle = this.shadow.getElementById('trl-card-title-edit');
            editEle.style.display = 'block';
            editEle.focus();
            editEle.select();
            this.changing = true;
        }
    }

    handleBlur() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
    }

    handleChange() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
    }

    handleDelete() {
        delCard(this.cardId)
            .then(res => {
                _update();
            })
            .catch(err => {
                console.log(err);
            })
    }

    changed() {
        const viewEle = this.shadow.getElementById('trl-card-title');
        const delEle = this.shadow.getElementById('trl-card-del');
        const editEle = this.shadow.getElementById('trl-card-title-edit');
        if (this.cardId) {
            viewEle.style.display = 'inline-block';
            delEle.style.display = 'inline-block';
            editEle.style.display = 'none';
            const newValue = editEle.value.trim();
            if (newValue != '' && newValue != this.card.title) {
                if (_cards.filter(c => c.title == newValue).length > 0) {
                    alert('That card title already exists.');
                    editEle.value = this.card.title;
                } else {
                    this.card.title = newValue;
                    setCard(this.cardId, this.card)
                        .then(res => {
                            this.updated();
                        })
                        .catch(err => {
                            console.log(err);
                        });
                }
            }
        }
    }
});

customElements.define('trl-card-description', class extends HTMLElement {
    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'open' });
        this.handleToggle = this.handleToggle.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.changing = false;
        this.expanded = false;
    }

    connectedCallback() {
        this.updated();
    }

    updated() {
        this.cardId = this.getAttribute('card');
        if (this.cardId && _cards) {
            this.card = _cards.find(c => c.id == this.cardId);
            const style = document.createElement('style');
            style.textContent = `
            #trl-card-description {
                display: none;
                min-height: 1em;
                white-space: pre-wrap;
                overflow: auto;
            }
            #trl-card-description.expanded {
                display: block;
            }
            #trl-card-description-toggle {
                font-size: smaller;
            }
            #trl-card-description-toggle.expanded {
                text-align: right;
                text-decoration: underline;
            }
            #trl-card-description-edit {
                display: none;
                width: 100%;
                box-sizing: border-box;
                overflow: hidden;
                font-family: inherit;
                font-size: inherit;
            }
            `;
            const viewEle = document.createElement('div');
            viewEle.id = 'trl-card-description';
            viewEle.textContent = this.card.description;
            viewEle.onclick = this.handleClick;
            const toggleEle = document.createElement('div');
            toggleEle.id = 'trl-card-description-toggle';
            toggleEle.textContent = '...';
            toggleEle.onclick = this.handleToggle;
            const editEle = document.createElement('textarea');
            editEle.id = 'trl-card-description-edit';
            editEle.textContent = this.card.description;
            editEle.onblur = this.handleBlur;
            editEle.onchange = this.handleChange;
            editEle.onkeyup = this.handleKeyUp;
            editEle.oninput = this.handleInput;
            this.shadow.innerHTML = '';
            this.shadow.appendChild(style);
            this.shadow.appendChild(viewEle);
            this.shadow.appendChild(toggleEle);
            this.shadow.appendChild(editEle);
        }
    }

    handleToggle() {
        if (this.cardId) {
            const viewEle = this.shadow.getElementById('trl-card-description');
            const toggleEle = this.shadow.getElementById('trl-card-description-toggle');
            if (!this.card.description || this.card.description == '') {
                this.handleClick();
            } else if (this.expanded) {
                viewEle.classList.remove('expanded');
                toggleEle.classList.remove('expanded');
                toggleEle.textContent = '...';
                this.expanded = false;
            } else {
                viewEle.classList.add('expanded');
                toggleEle.classList.add('expanded');
                toggleEle.textContent = 'collapse';
                this.expanded = true;
            }
            
        }
    }

    handleClick() {
        if (this.cardId) {
            this.shadow.getElementById('trl-card-description').style.display = 'none';
            this.shadow.getElementById('trl-card-description-toggle').style.display = 'none';
            const editEle = this.shadow.getElementById('trl-card-description-edit');
            editEle.style.display = 'block';
            editEle.style.height = 'auto';
            editEle.style.height = (editEle.scrollHeight) + 'px';
            editEle.focus();
            editEle.select();
            this.changing = true;
        }
    }

    handleBlur() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
    }

    handleChange() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
    }

    handleInput() {
        // Refer: https://stackoverflow.com/a/24676492/675194
        const editEle = this.shadow.getElementById('trl-card-description-edit');
        editEle.style.height = 'auto';
        editEle.style.height = (editEle.scrollHeight) + 'px';
    }

    changed() {
        const viewEle = this.shadow.getElementById('trl-card-description');
        const toggleEle = this.shadow.getElementById('trl-card-description-toggle');
        const editEle = this.shadow.getElementById('trl-card-description-edit');
        if (this.cardId) {
            viewEle.style.display = 'block';
            toggleEle.style.display = 'block';
            editEle.style.display = 'none';
            const newValue = editEle.value.trim();
            if (newValue != this.card.description) {
                this.card.description = newValue;
                setCard(this.cardId, this.card)
                    .then(res => {
                        this.updated();
                    })
                    .catch(err => {
                        console.log(err);
                    });
            }    
        }
    }
});

customElements.define('trl-add-card', class extends HTMLElement {
    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'open' });
        this.handleClick = this.handleClick.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    connectedCallback() {
        this.columnId = this.getAttribute('column');
        const style = document.createElement('style');

        style.textContent = `
        #trl-add-card {
            width: 100%;
        }
        #trl-add-card-edit {
            display: none;
            width: 100%;
            box-sizing: border-box;
            font-family: inherit;
            font-size: inherit;
        }
        #trl-add-card-btn {
            width: 100%;
            box-sizing: border-box;
            font-family: inherit;
            font-size: inherit;
        }
        `;
        const cardEle = document.createElement('div');
        cardEle.id = 'trl-add-card';
        const inputEle = document.createElement('input');
        inputEle.id = 'trl-add-card-edit';
        inputEle.onblur = this.handleBlur;
        inputEle.onchange = this.handleChange;
        const button = document.createElement('button');
        button.id = 'trl-add-card-btn';
        button.textContent = '+ Add a card';
        button.onclick = this.handleClick;
        cardEle.appendChild(inputEle);
        cardEle.appendChild(button);

        this.shadow.innerHTML = '';
        this.shadow.appendChild(style);
        this.shadow.appendChild(cardEle);
    }

    handleClick() {
        if (this.columnId) {
            this.shadow.getElementById('trl-add-card-btn').style.display = 'none';
            const editEle = this.shadow.getElementById('trl-add-card-edit');
            editEle.style.display = 'block';
            editEle.focus();
            editEle.select();
            this.changing = true;
        }
    }

    handleBlur() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
    }

    handleChange() {
        if (this.changing) {
            this.changing = false;
            this.changed();
        }
    }

    changed() {
        const btnEle = this.shadow.getElementById('trl-add-card-btn');
        const editEle = this.shadow.getElementById('trl-add-card-edit');
        btnEle.style.display = 'block';
        editEle.style.display = 'none';
        const newValue = editEle.value.trim();
        if (newValue != '') {
            if (_cards.filter(c => c.title == newValue).length > 0) {
                alert('That card title already exists.');
                editEle.value = '';
            } else {
                addCard({ title: newValue, columnId: this.columnId })
                    .then(res => {
                        _update();
                    })
                    .catch(err => {
                        console.log(err);
                    })
            }
        }
    }
});

/**
 * Loads from the API to populate cards and columns arrays, then updates the trl-columns element
 * @param {*} db - The API URL
 */
export function loadColumns(db) {
    _db = db;
    const columnsEle = document.getElementsByTagName('trl-columns')[0];

    if (columnsEle) {
        request({ method: 'GET', url: _db + '/columns' })
            .then(res => {
                _columns = JSON.parse(res);
                _update();
            })
            .catch(err => {
                console.log(err);
            });

        request({ method: 'GET', url: _db + '/cards' })
            .then(res => {
                _cards = JSON.parse(res);
                _update();
            })
            .catch(err => {
                console.log(err);
            });
    }
}

/**
 * Updates _filter, _filteredCards and _filteredColumns, then calls updated() on trl-columns element
 */
function _update() {
    if (!_filter) {
        _filter = '';
    }
    const columnsEle = document.getElementsByTagName('trl-columns')[0];
    if (columnsEle && _columns && _cards) {
        _filteredCards = _filter == '' ? _cards
            : _cards.filter(c => c.title.indexOf(_filter) > -1
                || (c.description && c.description.indexOf(_filter) > -1));
        _filteredColumns = _filter == '' ? _columns 
            : _columns.filter(c => _filteredCards.filter(f => f.columnId == c.id).length > 0);
        columnsEle.setAttribute('updated', 'true');
    }
}

/**
 * Adds a new column to the server
 * @param {*} val - a column object
 * @returns {Promise} Promise with the new column object
 */
export function addColumn(val) {
    return new Promise((resolve, reject) => {
        if (!_columns) {
            reject('Columns error. Try refreshing the page.');
        }
        request({ method: 'POST', url: _db + '/columns', params: val })
            .then(res => {
                let column = JSON.parse(res);
                _columns = _columns.concat(column);
                resolve(column);
            })
            .catch(err => {
                reject(err);
            });
    })
}

/**
 * Updates a column on the server
 * @param {*} id - id of the column to update 
 * @param {*} val - a column object
 * @returns {Promise} Promise with the updated column object
 */
export function setColumn(id, val) {
    return new Promise((resolve, reject) => {
        if (!_columns) {
            reject('Columns error. Try refreshing the page.');
        }
        const column = _columns.find(c => c.id == id);
        if (!column) {
            reject('Column error. Try refreshing the page.');
        }
        request({ method: 'PUT', url: _db + '/columns/' + id, params: val })
            .then(res => {
                let column = _columns.find(c => c.id == id);
                column = JSON.parse(res);
                resolve(column);
            })
            .catch(err => {
                reject(err);
            });
    });
}

/**
 * Deletes a column on the server
 * @param {*} id - id of the column to delete
 * @returns {Promise} Promise with empty object
 */
export function delColumn(id) {
    return new Promise((resolve, reject) => {
        if (!_columns) {
            reject('Columns error. Try refreshing the page.');
        }
        request({ method: 'DELETE', url: _db + '/columns/' + id })
            .then(res => {
                _columns = _columns.filter(c => c.id != id);
                _cards = _cards.filter(c => c.columnId != id);  // note DELETE on /columns/id also deletes any card with that columnId
                resolve(JSON.parse(res));
            })
            .catch(err => {
                reject(err);
            });
    })
}

/**
 * Adds a new card to the server
 * @param {*} val - a card object
 * @returns {Promise} Promise with the new card object
 */
export function addCard(val) {
    return new Promise((resolve, reject) => {
        if (!_cards) {
            reject('Cards error. Try refreshing the page.');
        }
        request({ method: 'POST', url: _db + '/cards', params: val })
            .then(res => {
                let card = JSON.parse(res);
                _cards = _cards.concat(card);
                resolve(card);
            })
            .catch(err => {
                reject(err);
            });
    })
}

/**
 * Updates a card on the server
 * @param {*} id - id of the card to update
 * @param {*} val - a card object
 * @returns {Promise} Promise with the updated card object
 */
export function setCard(id, val) {
    return new Promise((resolve, reject) => {
        if (!_cards) {
            reject('Cards error. Try refreshing the page.');
        }
        const card = _cards.find(c => c.id == id);
        if (!card) {
            reject('Card error. Try refreshing the page.');
        }
        request({ method: 'PUT', url: _db + '/cards/' + id, params: val })
            .then(res => {
                let card = _cards.find(c => c.id == id);
                card = JSON.parse(res);
                resolve(card);
            })
            .catch(err => {
                reject(err);
            });
    });
}

/**
 * Deletes a card on the server
 * @param {*} id - id of the card to delete
 * @returns {Promise} Promise with empty object
 */
export function delCard(id) {
    return new Promise((resolve, reject) => {
        if (!_cards) {card
            reject('Cards error. Try refreshing the page.');
        }
        request({ method: 'DELETE', url: _db + '/cards/' + id })
            .then(res => {
                _cards = _cards.filter(c => c.id != id);
                resolve(JSON.parse(res));
            })
            .catch(err => {
                reject(err);
            });
    })
}

/** 
 * @returns {Array} A copy of the columns array.
 */
export function columns() {
    return _columns ? _columns.slice() : null;
}

/** 
 * @returns {Array} A copy of the cards array.
 */
export function cards() {
    return _cards ? _cards.slice() : null;
}