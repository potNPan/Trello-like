 /**
 * Make a HTTP request
 * @param {Object} options - Options for the request
 * @param {*} options.method - Method for request: 'GET', 'POST', 'PUT', or 'DELETE'
 * @param {*} options.url - URL for the request
 * @param {*} options.params - JSON object for parameters to be sent with the request
 * @returns {Promise} Promise with the result of the request
 */
export function request(options) {
    return new Promise((resolve, reject) => {
        if (typeof options !== 'object' || typeof options === 'null') {
            reject('Options not provided.');
        }
        if (!options.url) {
            reject('No url provided.');
        }
        if (!options.method) {
            options.method = 'GET';
        }
        const http = new XMLHttpRequest();
        http.open(options.method, options.url);
        switch(options.method) {
            case 'POST':
            case 'PUT':
                http.setRequestHeader('Content-Type', 'application/json');
                break;
        }
        http.send(JSON.stringify(options.params));

        http.onload = () => {
            if (http.status >= 200 && http.status < 300) {
                resolve(http.response);
            } else {
                reject('Error: ' + http.status);
            }
        }

        http.onerror = () => {
            reject('Error: ' + http.status);
        };
    });
}