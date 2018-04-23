'use strict';

const fs = require('fs');
const path = require('path');

module.exports = ( ) => {
    const { project } = JSON.parse( fs.readFileSync( path.resolve( __dirname, './package.json' ), 'utf8' ) );

    for ( let k in project ) {
        project[ k ] = path.resolve( __dirname, `./project/${ project[ k ] }` );
    }

    return project;
};
