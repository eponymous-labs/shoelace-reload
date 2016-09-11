// Carbide's hot-reloading engine is a bit different from
// the hot module replacement packages that you find in
// Webpack, Browserify, or SystemJS. 

// We don't want to unload/reload any modules which don't
// explicitly declare themselves to be safe to reload. 
// but we also want to allow hot reloading to work for
// as many modules as possible out of the box. 

// At the same time, we want module reloading to happen
// as fast as possible. We want to avoid recompiling
// files that don't need to be recompiled, and we want
// to avoid executing files which don't need to be executed. 

// Key to accomplishing this is the fact that if you have
// code like this:

// module b:
// import a from 'module-a'
// export default function(){
// 	return a + 4
// }

// you don't actually need to re-evaluate 'module-b'
// when 'module-a' changes. Instead, we call some internal
// setters to replace the reference of 'module-a' in the 
// live version of 'module-b'. 

// and when you do have to re-evaluate a module,
// most of the time you don't actually have to transpile
// the thing. 

// TODO: figure out how to get this to work for mutually recursive modules


export async function reimportModule(path){
	// console.log('reimporting', path)
	var old_module = await unloadedModule(path)

	// this is the real meaty bit
	System.delete(path)
	await System.import(path)

	await reloadedModule(path, old_module)
	bubbleModule(path)

	return System.get(path);
}

export async function refreshModule(path){
	// console.log('refreshing', path)
	var old_module = cloneModule(await unloadedModule(path))

	var record = System._loader.moduleRecords[path]
	record.execute()

	await reloadedModule(path, old_module)
	bubbleModule(path)

	return System.get(path);
}



async function bubbleModule(path){
	var new_module = System.get(path)
	var importing = []
	for(let [imp, i] of listImporterIndices(path)){
		// call setters
		let rec = System._loader.moduleRecords[imp.address]
		rec.setters[i](new_module)

		// get a reference to the module
		importing.push(imp)
	}


	for(let imp of importing){
		let mod = System.get(imp.address)

		if(mod.__forceReload){
			await refreshModule(imp.address)
		}else{
			await bubbleRender(imp.address)
		}
	}
}


async function bubbleRender(path){
	// console.log('bubble', path)
	let mod = System.get(path)
	
	if(mod.__render){
		return await mod.__render()
	}

	for(let imp of listImporters(path)){
		await bubbleRender(imp.address)
	}
}


async function unloadedModule(path){
	var mod = System.get(path)
	if(mod && mod.__unload){
		await mod.__unload()
	}
	return mod;
}

async function reloadedModule(path, old_module){
	// don't fire reloadedModule on the first mount
	if(old_module){
		var mod = System.get(path)
		if(mod.__reload){
			await mod.__reload(old_module)
		}
	}
}


function cloneModule(mod){
	// when re-executing modules, the actual module doesn't change
	// so instead of passing a fully qualified module, we just clone
	// all the exports and return that object

	var clone = {}
    Object.getOwnPropertyNames(mod)
    	.forEach(key => clone[key] = mod[key]);

    return clone
}


function listImporterIndices(name){
	var imports = [];
	Object.keys(System.loads).forEach((moduleName) => {
		var mod = System.loads[moduleName]
		mod.deps.forEach((dependantName, i) => {
			if(name === mod.depMap[dependantName]){
				imports.push([mod, i])
			}
		})
	})
	return imports;
}


function listImporters(path){
	return listImporterIndices(path).map(k => k[0])
}
