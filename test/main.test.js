import { request } from '../public/js/db.js';
import 'mutationobserver-shim';
import '@webcomponents/webcomponentsjs';
import { loadColumns, columns, cards, addColumn, addCard, setColumn, setCard, delColumn, delCard } from '../public/js/main.js';

test('GET request returns result', () => {
    expect.assertions(1);
    return request({ method: 'GET', url: 'https://jsonplaceholder.typicode.com/users' })
        .then(res => {
            const obj = JSON.parse(res);
            expect(obj).toBeInstanceOf(Array);
        })
});

test('POST request returns result', () => {
    expect.assertions(1);
    return request({ method: 'POST', url: 'https://jsonplaceholder.typicode.com/users', params: { test: 1 }})
        .then(res => {
            const obj = JSON.parse(res);
            expect(obj).toBeInstanceOf(Object);
        })
});

test('PUT request returns result', () => {
    expect.assertions(1);
    return request({ method: 'PUT', url: 'https://jsonplaceholder.typicode.com/users/1', params: { test: 1 }})
        .then(res => {
            const obj = JSON.parse(res);
            expect(obj).toBeInstanceOf(Object);
        })
});

test('DELETE request returns result', () => {
    expect.assertions(1);
    return request({ method: 'DELETE', url: 'https://jsonplaceholder.typicode.com/users/1'})
        .then(res => {
            const obj = JSON.parse(res);
            expect(obj).toBeInstanceOf(Object);
        })
});

test('GET request for invalid URL returns error', () => {
    expect.assertions(1);
    return request({ method: 'GET', url: 'http://notarealurl.totally.com/' })
        .catch(err => {
            expect(true).toBeTruthy();
        });
});

test('customElements exists', () => {
    expect(window.customElements).toBeDefined();
});

let columnsEle = document.createElement('trl-columns');
document.body.appendChild(columnsEle);
loadColumns('http://localhost:3000');

test('loadColumns loads columns and cards in 2 seconds', done => {
    setTimeout(() => {
        expect(columns()).toBeInstanceOf(Array);
        expect(cards()).toBeInstanceOf(Array);
        done();
    }, 2000);
});

let testColId, testCardId, testCard2Id;

function getRandom() {
    return Math.floor(Math.random() * 1000000000);
}

test('addColumn', () => {
    expect.assertions(1);
    const rand = getRandom();
    return addColumn({ title: `Test ${rand}`})
        .then(res => {
            expect(res).toBeInstanceOf(Object);
            testColId = res.id;
        })
        .catch(err => {
            console.log(err);
        });
});

test('addCard', () => {
    expect.assertions(1);
    const rand = getRandom();
    return addCard({ title: `Test ${rand}` })
        .then(res => {
            expect(res).toBeInstanceOf(Object);
            testCardId = res.id;
        });
});

test('addCard 2', () => {
    expect.assertions(1);
    const rand = getRandom();
    const columnId = columns().filter(c => c.id != testColId)[0].id;
    return addCard({ title: `Test ${rand}`, columnId: columnId })
        .then(res => {
            expect(res.columnId).toBe(columnId);
            testCard2Id = res.id;
        });
});

test('setColumn', () => {
    expect.assertions(2);
    const rand = getRandom();
    const title = `Test ${rand}`;
    return setColumn(testColId, { title: title })
        .then(res => {
            expect(res).toBeInstanceOf(Object);
            expect(res.title).toBe(title);
        });
});

test('setCard', () => {
    expect.assertions(4);
    const rand = getRandom();
    const title = `Test ${rand}`;
    const description = `Description ${rand}`;
    return setCard(testCardId, { title: title, description: description, columnId: testColId })
        .then(res => {
            expect(res).toBeInstanceOf(Object);
            expect(res.title).toBe(title);
            expect(res.description).toBe(description);
            expect(res.columnId).toBe(testColId);
        });
});

test('delColumn', () => {
    expect.assertions(1);
    return delColumn(testColId)
        .then(res => {
            expect(res).toBeInstanceOf(Object);
        });
});

test('delCard', () => {
    expect.assertions(1);
    return delCard(testCardId)
        .catch(err => {
            expect(err.indexOf('404')).toBeGreaterThan(-1);
        });
});

test('delCard 2', () => {
    expect.assertions(1);
    return delCard(testCard2Id)
        .then(res => {
            expect(res).toBeInstanceOf(Object);
        });
});