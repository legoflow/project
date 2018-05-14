'use strict';

const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const config = require('legoflow-config');
const YAML = require('yamljs');
const formatYamlFile = require('format-yaml');

const getDefalutProjectType = ( ) => {
    const { project } = JSON.parse( fs.readFileSync( path.resolve( __dirname, './package.json' ), 'utf8' ) );

    for ( let k in project ) {
        project[ k ] = path.resolve( __dirname, `./project/${ project[ k ] }` );
    }

    return project;
}

const getCustomProjectType = ( ) => {
    const customProjectPath = config.get( 'customProjectPath' ) || '';

    let customProject = { };

    if ( customProjectPath && fs.existsSync( customProjectPath ) ) {
        const customProjectFolder = fs.readdirSync( customProjectPath ).filter( ( n ) => fs.statSync( path.resolve( customProjectPath, n ) ).isDirectory( ) )

        customProjectFolder.forEach( ( item ) => {
            customProject[ item ] = path.resolve( customProjectPath, item );
        } )
    }

    return customProject;
}

const getProjectType = ( ) => {
    return Object.assign( getDefalutProjectType( ), getCustomProjectType( ) );
}

exports.getProjectType = getProjectType;

const newDefaultProject = async ( data ) => {
    let { name, type, path: projectPath, version, isESNext, isSourcePath, author, c_version } = data;

    const types = getDefalutProjectType( );

    const projectTypePath = types[ type ];

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

    return data;
}

const newCustomProject = async ( data ) => {
    let { name, type, path: projectPath, version, isESNext, isSourcePath, author, c_version } = data;

    const types = getCustomProjectType( );

    const projectTypePath = types[ type ];

    const yamlConfigPath = path.resolve( projectTypePath, 'legoflow.yml' );
    const packageJsonPath = path.resolve( projectTypePath, 'package.json' );

    if ( !fs.existsSync( yamlConfigPath ) ) {
        return '该项目类型缺少配置模板文件';
    }

    if ( !fs.existsSync( packageJsonPath ) ) {
        return '该项目类型缺少模板 package.json';
    }

    const replaceInfo = ( str ) => {
        return str.replace( /\[name\]/g, name )
                    .replace( /\[version\]/g, version )
                    .replace( /\[author\]/g, author )
                    .replace( /\[c_version\]/g, c_version )
                    .replace( /\[type\]/g, type )
                    .replace( /\[ESNext\]/g, isESNext )
    }

    const yamlConfig = replaceInfo( fs.readFileSync( yamlConfigPath, 'utf8' ) );
    const packageJson = replaceInfo( fs.readFileSync( packageJsonPath, 'utf8' ) );

    fs.ensureDirSync( projectPath );

    fs.writeFileSync( path.resolve( projectPath, 'legoflow.yml' ), yamlConfig );
    fs.writeFileSync( path.resolve( projectPath, 'package.json' ), packageJson );

    // copy src folder
    const srcPath = path.resolve( projectTypePath, 'src' );

    fs.existsSync( srcPath ) && fs.copySync( srcPath, path.resolve( projectPath, 'src' ) );

    // copy shell folder
    const shellPath = path.resolve( projectTypePath, 'shell' );

    fs.existsSync( shellPath ) && fs.copySync( srcPath, path.resolve( shellPath, 'shell' ) );

    return data;
}

exports.new = async ( data ) => {
    let { name, path: projectPath, isSourcePath, type } = data;

    if ( !isSourcePath ) {
        data.path = projectPath = path.resolve( projectPath, `./${ name }` );
    }

    if ( !isSourcePath && fs.existsSync( projectPath ) ) {
        return '项目已存在';
    }

    if ( fs.existsSync( data.path ) && glob.sync( `${ data.path }/**/*` ).length > 0 ) {
        return '路径存在其他文件';
    }

    if ( getCustomProjectType( )[ type ] ) {
        return await newCustomProject( data );
    }
    else if ( getDefalutProjectType( )[ type ] ) {
        return await newDefaultProject( data );
    }
    else {
        return '找不到该类型项目';
    }
}
