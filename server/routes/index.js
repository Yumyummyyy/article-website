const routes = {
    "/login": require('./login'),
    "/register": require('./register'),
    "/createArticle": require('./createArticle')
}

/*
module.exports = (app) => {
    routes.forEach((item) => {
        item(app)
    })
}
*/

function addApiRoutes(app) {
    Object.keys(routes).forEach(route => {
        const router = routes[route]
        app.use(route, router)
    });
}

module.exports = addApiRoutes