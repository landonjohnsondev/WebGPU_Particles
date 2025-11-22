function IsNumeric(str)
{
    return !isNaN(str) && !isNaN(parseFloat(str));
}

function TriangulateFace(idxArr)
{				
    newIndexes = [];
    newIndexes.push(idxArr[0]);
    newIndexes.push(idxArr[1]);
    newIndexes.push(idxArr[2]);

    for(let i = 3; i < idxArr.length; i++)
    {
        newIndexes.push(idxArr[0]);
        newIndexes.push(idxArr[i-1]);
        newIndexes.push(idxArr[i]);
    }				
    return newIndexes;
}

function GetVertexAtIdx(vertices, idx)
{
    let vertice = [];
    for(let i = idx*3; i < (idx*3)+3; i++)				
        vertice.push(vertices[i]);				
    
        return vertice;
}

function GetNormalAtIdx(normals, idx)
{
    let normal = [];
    for(let i = idx*3; i < (idx*3)+3; i++)				
        normal.push(normals[i]);
    
    return normal;
}

function GetTexCoordsAtIdx(texCoords, idx)
{
    let texel = [];
    for(let i = idx*2; i < (idx*2)+2; i++)
        texel.push(texCoords[i]);
    
    return texel;
}

function ParseVertices(fileContent, materialContent)
{
    vertices = [];
    indexes = [];
    normals = [];
    texCords = [];

    let normalMap = [];
    //get window[normalMapStr] and return it

    shiny = 0.0;
    Ka = [];
    Ks = [];

    //using this for color
    let KdVals = [];

    let KaVals = [];     
    let KsVals = [];
    let shinyVals = [];    
    if(materialContent == undefined)
    {
        console.log("KdVals WAS EMPTY");
        return;
    }

    let lastMatName = "";  
    var texture;

    for(const line of materialContent.split("\n"))
    {
        if(line.split(' ')[0] == "newmtl")					
        {
            lastMatName = line.split(' ')[1];
        }

        else if(line.split(' ')[0] == "Kd")
            KdVals[lastMatName] = line.substring(3).split(' ');
        else if(line.split(' ')[0] == "Ka")
            KaVals[lastMatName] = line.substring(3).split(' ');
        else if(line.split(' ')[0] == "Ks")
            KsVals[lastMatName] = line.substring(3).split(' ');
        else if(line.split(' ')[0] == "Ns")
            shinyVals[lastMatName] = line.substring(3);

        // else if(line.split(' ')[0] == "map_Kd")
        // {
        //     texture = 
        // }
    }

    for(const line of fileContent.split("\n"))
    {										
        //need to pair the correct normal with each vertex
        if(line.split(' ')[0] == "vn")
        {
            for(const normal of line.substring(3).split(' '))
                normals.push(parseFloat(normal));
        }

        if(line.split(' ')[0] == "vt")
        {
            for(const tex of line.substring(3).split(' '))
                texCords.push(parseFloat(tex));
        }

        if(line.substring(0,2) != 'v ')
            continue;
        
        for(const num of line.split(' '))
        {
            if(IsNumeric(num))
                vertices.push(parseFloat(num));
        }
    }

    let finalVertices = [];
    let usedVertices = [];
    let finalVerticeIndexes = [];    

    for(const line of fileContent.split("\n"))
    {
        if(line.split(' ')[0] == "usemtl")	        
            curMat = line.split(' ')[1];                                      

        //parse face indexes
        if(line[0] != 'f')
            continue;										

        let faceVertices = line.split(' ');
        let lineIndexes = [];
        for(let i = 1; i < faceVertices.length; i++)
        {
            let nums = faceVertices[i].split('/');
            let vertexIdx = nums[0]-1;
            let textureIdx = nums[1]-1;            
            let normalIdx = nums[2]-1;					
            //use dictionary with vertex and normal index together as key to ensure unique (vertice,color,normal) cominations
            let key = vertexIdx.toString() + " " + normalIdx.toString();         
            if(!usedVertices[key])
            {
                let newIdx = finalVertices.length / GPU.vertexStride;
                let vertice = GetVertexAtIdx(vertices, vertexIdx);    
                let normal = GetNormalAtIdx(normals, normalIdx);
                let texel = GetTexCoordsAtIdx(texCords, textureIdx);
                
                //console.log(Object.getOwnPropertyNames(KdVals)); // shows all hashmap entries
                
                //console.log("texture idx: " + textureIdx);    
                if(Object.keys(KdVals).length != 0)
                    vertice.push(parseFloat(KdVals[curMat][0]), parseFloat(KdVals[curMat][1]), parseFloat(KdVals[curMat][2]));                
                else
                    vertice.push(0,0,0);

                //replacing with textures for now
                if(textureIdx != undefined)
                {                    
                    vertice.push(texel[0], texel[1]);
                }
                else
                {
                    console.log("undefined texture idx");
                    vertice.push(0, 0);
                }

                vertice.push(normal[0], normal[1], normal[2]);
                
                if(Object.keys(KaVals).length != 0)
                {
                    vertice.push(KaVals[curMat][0], KaVals[curMat][1], KaVals[curMat][2]);
                    vertice.push(KsVals[curMat][0], KsVals[curMat][1], KsVals[curMat][2]);
                    vertice.push(shinyVals[curMat]);
                }
                else
                {
                    vertice.push(0,0,0);
                    vertice.push(0,0,0);
                    vertice.push(0);
                }               

                for(const flt of vertice)
                    finalVertices.push(flt);
                                                                                                                                
                usedVertices[key] = [true, newIdx];
                lineIndexes.push(newIdx);
            }
            else
            {                
                lineIndexes.push(usedVertices[key][1]);
            }						
        }

        //console.log("finalVertices: " + finalVertices);
        let fullIndexes = TriangulateFace(lineIndexes);
        for(const idx of fullIndexes)					        
            finalVerticeIndexes.push(idx);			                    
    }				

    floatVertices = new Float32Array(finalVertices);
    intIndexes = new Uint16Array(finalVerticeIndexes);
    
    // console.log("vertices: " + floatVertices);
    // console.log("indexes: " + intIndexes);
    
    results = [floatVertices, intIndexes, KaVals[lastMatName], KsVals[lastMatName], shinyVals[lastMatName]];
    return results;
}