'use strict';

const routes = [
    {
        path: '/',
        component: ( ) => import( /* webpackChunkName: "test" */ './components/test' ),
    },
];

const router = new VueRouter( {
    routes,
} );

new Vue( {
    el: 'app',
    router,
    render ( h ) {
        return ( <router-view></router-view> );
    }
} )
