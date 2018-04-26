'use strict';

const path = require('path');
const fs = require('fs-extra');
const YAML = require('yamljs');
const formatYamlFile = require('format-yaml');

const getProjectType = require('./getProjectType');

module.exports = async ( data ) => {
    let { name, type, path: projectPath, version, isESNext, isSourcePath, author, c_version } = data;

    const types = getProjectType( );

    if ( !isSourcePath ) {
        projectPath = path.resolve( projectPath, `./${ name }` );
    }

    if ( fs.existsSync( projectPath ) ) {
        return '项目已存在';
    }

    const projectTypePath = types[ type ];

    if ( !fs.existsSync( projectTypePath ) ) {
        return '找不到该类型项目';
    }

    fs.ensureDirSync( projectPath );

    // package.json
    let packageJSON = {
        name,
        version,
        author,
    };

    fs.writeFileSync( path.resolve( projectPath, './package.json' ), JSON.stringify( packageJSON, null, 4 ) );

    // legoflow.json
    let legoflowJSON = {
        name,
        version: c_version,
        type,
        REM: false,
        'ES.Next': isESNext || true,
        alias: { },
        global: { },
    };

    switch ( type ) {
		case 'Mobile': {
            legoflowJSON.REM = true;
            legoflowJSON.alias = { $: './src/assets/zepto.min.js', zepto: './src/assets/zepto.min.js' };
			legoflowJSON.global = { $: 'zepto', zepto: 'zepto', };
			break;
        }
		case 'PC': {
            legoflowJSON.alias = { $: './src/assets/jquery.min.js', jquery: './src/assets/jquery.min.js', jQuery: './src/assets/jquery.min.js', };
			legoflowJSON.global = { $: 'jquery', jquery: 'jquery', jQuery: 'jquery', };
			break;
        }
		case 'Vue.js': {
            legoflowJSON.externals = { vue: 'Vue' };
		    break;
        }
    }

    const configFile = path.resolve( projectPath, './legoflow.yml' );

    fs.writeFileSync( configFile, YAML.stringify( legoflowJSON, 4 ) );

    // format YAML file
    fs.writeFileSync( configFile, await formatYamlFile( configFile ) );

    // cope type folder
    fs.copySync( projectTypePath, path.resolve( projectPath, './src' ) );

    // create img folder
    const imgFolder = path.resolve( projectPath, './src/img' );
    const imgBase64Folder = path.resolve( projectPath, './src/img/base64' );
    const imgSliceFolder = path.resolve( projectPath, './src/img/slice' );

    fs.mkdirSync( imgFolder );
    fs.mkdirSync( imgBase64Folder );
    fs.mkdirSync( imgSliceFolder );

    // cope .gitignore
    const gitignoreFile = path.resolve( __dirname, './project/gitignore' );

    fs.copySync( gitignoreFile, path.resolve( projectPath, './.gitignore' ) );

    return Object.assign( data, { path: projectPath } );
};
