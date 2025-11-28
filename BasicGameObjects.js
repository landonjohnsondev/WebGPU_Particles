class Transform
		{
			constructor()
			{
				this.forward = [0,0,1];
				this.right = [1,0,0];
				this.up = [0,1,0];				
			}
		
			doRotations(RotAngles)
			{
				this.xRot = [
							[1,0,0,0],
							[0,Math.cos(RotAngles[0]),-1*Math.sin(RotAngles[0]),0],
							[0,Math.sin(RotAngles[0]),Math.cos(RotAngles[0]),0],
							[0,0,0,1]
						];		
				this.yRot = [
						[Math.cos(RotAngles[1]),0,Math.sin(RotAngles[1]),0],
						[0,1,0,0],
						[-1*Math.sin(RotAngles[1]),0,Math.cos(RotAngles[1]),0],
						[0,0,0,1]	
						];
				this.zRot = [
							[Math.cos(RotAngles[2]),-1*Math.sin(RotAngles[2]),0,0],
							[Math.sin(RotAngles[2]),Math.cos(RotAngles[2]),0,0],
							[0,0,1,0],
							[0,0,0,1]
						]
				//this.forward = this.crossMultiply(xRot,[0,0,1,0]);		
				this.forward = this.crossMultiply(this.zRot,this.crossMultiply(this.yRot,this.crossMultiply(this.xRot,[0,0,1,0])))
				this.right = this.crossMultiply(this.zRot,this.crossMultiply(this.yRot,this.crossMultiply(this.xRot,[1,0,0,0])))
				this.up = this.crossMultiply(this.zRot,this.crossMultiply(this.yRot,this.crossMultiply(this.xRot,[0,1,0,0])))
			}			
			crossMultiply(M,V)
			{
			// console.log(M[0][3]);
			// console.log(V[3]);
			var temp = [
						M[0][0]*V[0]+M[0][1]*V[1]+M[0][2] * V[2]+ M[0][3]*V[3],
						M[1][0]*V[0]+M[1][1]*V[1]+M[1][2] * V[2]+ M[1][3]*V[3],
						M[2][0]*V[0]+M[2][1]*V[1]+M[2][2] * V[2]+ M[2][3]*V[3],
						M[3][0]*V[0]+M[3][1]*V[1]+M[3][2] * V[2]+ M[3][3]*V[3]
						]
			//console.log(temp);
				return temp;
			}						
		}


class GameObject
{
	constructor(pos, rot, scale) 
	{
		this.pos = [pos[0],pos[1],pos[2]];
		this.localPos = [pos[0],pos[1],pos[2]];

		this.rot = [rot[0],rot[1],rot[2]];
		this.localRot = [rot[0],rot[1],rot[2]];

		if(scale == undefined)
			scale = [1,1,1];
		
		this.scale = [1,1,1];
		this.localScale = [scale[0],scale[1],scale[2]];

		this.localWorldMatrix = [
									[1,0,0,0],
									[0,1,0,0],
									[0,0,1,0],
									[0,0,0,1],
								];

					this.worldMatrix = [
											[1,0,0,0],
											[0,1,0,0],
											[0,0,1,0],
											[0,0,0,1],
										];

		this.directChildren = [];
		this.parent = null;

		this.isTrigger = false;
		this.collissionRadius = 1.0;
		this.velocity = [0,0,0];
		this.angVelocity = [0,0,0];
		this.name = "default";
		this.id = 0;
		this.prefab;
		this.transform = new Transform();		

		this.uniformBufferSize = 240;
		this.uniformBuffer = GPU.device.createBuffer({
			label: 'uniformBuffer',
			size: this.uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		//initialize resolution
		GPU.device.queue.writeBuffer(this.uniformBuffer, 228, new Float32Array([(window.innerHeight/window.innerWidth)]));
	}

	IndexDraw(commandPass)
	{
		commandPass.setBindGroup(0, this.mainBindGroup);					
		commandPass.setBindGroup(2, this.textureBindGroup);									

		GPU.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([
			this.worldMatrix[0][0],this.worldMatrix[1][0],this.worldMatrix[2][0],this.worldMatrix[3][0],
			this.worldMatrix[0][1],this.worldMatrix[1][1],this.worldMatrix[2][1],this.worldMatrix[3][1],
			this.worldMatrix[0][2],this.worldMatrix[1][2],this.worldMatrix[2][2],this.worldMatrix[3][2],
			this.worldMatrix[0][3],this.worldMatrix[1][3],this.worldMatrix[2][3],this.worldMatrix[3][3],
		]));				
		GPU.device.queue.writeBuffer(this.uniformBuffer, 64, new Float32Array(this.rot));

		if(this.timer != undefined)
			GPU.device.queue.writeBuffer(this.uniformBuffer, 120, new Float32Array([this.timer]));

		GPU.device.queue.writeBuffer(this.uniformBuffer, 228, new Float32Array([0.5]));
		
		GPU.device.queue.writeBuffer(this.uniformBuffer, 80, new Float32Array(this.Ka));
		GPU.device.queue.writeBuffer(this.uniformBuffer, 96, new Float32Array(this.Ks));						
		GPU.device.queue.writeBuffer(this.uniformBuffer, 108, new Float32Array([this.specularity]));

		commandPass.setVertexBuffer(0, this.vertexBuffer);
		commandPass.setIndexBuffer(this.indexBuffer, "uint16");					
		commandPass.drawIndexed(this.indexes.length);
	}

	ParticleDraw(commandPass)
	{
		commandPass.setBindGroup(0, this.billboardGroup);
		commandPass.setBindGroup(2, this.textureBindGroup);

		//The reason for the timer issue is that every object uses its own uniform buffer, which sets timer to 0					
		GPU.device.queue.writeBuffer(this.uniformBuffer, 120, new Float32Array([this.timer]));
		
		GPU.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([
			this.worldMatrix[0][0],this.worldMatrix[1][0],this.worldMatrix[2][0],this.worldMatrix[3][0],
			this.worldMatrix[0][1],this.worldMatrix[1][1],this.worldMatrix[2][1],this.worldMatrix[3][1],
			this.worldMatrix[0][2],this.worldMatrix[1][2],this.worldMatrix[2][2],this.worldMatrix[3][2],
			this.worldMatrix[0][3],this.worldMatrix[1][3],this.worldMatrix[2][3],this.worldMatrix[3][3],
		]));				
		
		commandPass.setVertexBuffer(0, this.vertexBuffer);
		commandPass.draw(6,1,0,0);
	}

	Normalize(vector)
	{
		let magnitude = math.sqrt(vector[0]**2 + vector[1]**2 + vector[2]**2);
		if(magnitude == 0)
			return [0,0,0];

		let normalVector = [];
		normalVector[0] = vector[0] / magnitude;
		normalVector[1] = vector[1] / magnitude;
		normalVector[2] = vector[2] / magnitude;
		return normalVector;
	}

	VectorSum(vector1, vector2)
	{
		let sum = [];
		sum.push(vector1[0] + vector2[0]);
		sum.push(vector1[1] + vector2[1]);
		sum.push(vector1[2] + vector2[2]);
		return sum;
	}

	VectorDistance(vector1, vector2) // two positions
	{
		let dist = 0.0;
		dist += math.pow(vector1[0] - vector2[0], 2);
		dist += math.pow(vector1[1] - vector2[1], 2);	
		dist += math.pow(vector1[2] - vector2[2], 2);
		dist = math.sqrt(dist);
		return dist;
	}

	UpdateCell()
	{
		var cellWidth = 128;
		newCellX = math.floor(this.pos[0] / cellWidth);
		newCellY = math.floor(this.pos[1] / cellWidth);
		newCellZ = math.floor(this.pos[2] / cellWidth);
		
		if(this.cellX != newCellX || this.cellY != newCellY || this.cellZ != newCellZ)
		{
			//remove item from list at that idx			
			var curObj = GPU.cells[this.cellX][this.cellY][this.cellZ].objIndex;
			GPU.cells[this.cellX][this.cellY][this.cellZ].objIndex = null;
			GPU.cells[newCellX][newCellY][newCellZ].append(curObj);
			//put item at new idx

			this.cellX = newCellX;
			this.cellY = newCellY;
			this.cellZ = newCellZ;
		}
	}

	SortByX(positions)
	{
		let sortedPositions = [];
		let positionsUsed = [];

		for(let i = 0; i < positions.length; i++)
			positionsUsed[i] = false;

		for(let i = 0; i < positions.length; i++)
		{
			let minX = 9999;
			let maxPosIdx = -1;
			for(let j = 0; j < positions.length; j++)
			{
				if(positions[j][0] < minX && !positionsUsed[j])
				{
					minX = positions[j][0];
					maxPosIdx = j;
				}
			}
			sortedPositions.push([positions[maxPosIdx][0], positions[maxPosIdx][1], positions[maxPosIdx][2]]);
			positionsUsed[maxPosIdx] = true;
		}		
		return sortedPositions;			
	}
				
	Move()
	{
		var tempP = [0,0,0]
		for(var i = 0; i < 3; i++)
		{
			tempP[i] = this.pos[i];
			tempP[i] += this.velocity[i];
			this.rot[i] += this.angVelocity[i];
		}

		//how to do collision: 
		//if object is solid, check collision with solids for Clear and collision with triggers for OnTriggerHit
		//if object is trigger, check collision with other triggers for OnTriggerHit. let solids do Clear checking

		//Solid
		//	check Clear
		//	check triggers for OnTriggerHit
		//Trigger
		//	check triggers for OnTriggerHit

		//call trigger hit on solid or trigger?

		//means this is a Solid
		if(!this.isTrigger)
		{
			var clear = true;
			for(var so in GPU.Solid)
			{
				if(GPU.Solid[so] != this)
				{
					if(GPU.CheckCollision(tempP, this.collissionRadius, GPU.Solid[so].pos, GPU.Solid[so].collissionRadius))
					{
						clear = false;
						tempP.OnPhysicalHit(m.Solid[so])
						try
						{
							m.Solid[so].OnPhysicalHit(tempP)
						}
						catch (error)
						{
							//Assume other object has been destroyed
						}
					}
				}
			} 
			if(clear)
			{
				this.loc = tempP;
			}
		}
		//means this is a trigger
		else
		{
			this.pos = tempP;
			for(var so in m.Trigger)
			{
				if(m.Trigger[so] != this)
				{
					if(GPU.CheckCollision(tempP, this.collissionRadius, GPU.Trigger[so].pos, GPU.Trigger[so].collissionRadius))
					{
						tempP.OnTriggerHit(m.Trigger[so])
						try
						{
							m.Trigger[so].OnTriggerHit(tempP)
						}
						catch (error)
						{
							//Assume other object has been destroyed
						}
					}
				}
			} 
		}
	}

	ApplySceneGraph()
	{
		//matrices multiply right to left, so do T*R*S
		var translateRotate = math.multiply(this.TranslationMatrix(this.localPos), this.RotationMatrix(this.localRot));
		this.localWorldMatrix = math.multiply(translateRotate, this.ScaleMatrix(this.localScale));

		if(this.parent != null)
		{
			this.worldMatrix = math.multiply(this.parent.worldMatrix, this.localWorldMatrix);				
		}
		else		
		{
			this.worldMatrix = this.localWorldMatrix;
			this.localPos = [ this.worldMatrix[0][3], this.worldMatrix[1][3], this.worldMatrix[2][3] ];
		}

		this.pos = [ this.worldMatrix[0][3], this.worldMatrix[1][3], this.worldMatrix[2][3] ];
	}

	//create dummy texture and dummy normal map if none are provided
	SetupTextures(rawTexture, normalMap)
	{															
		//set usingTexture and usingNormalMap to false until proven true
		GPU.device.queue.writeBuffer(this.uniformBuffer, 112, new Uint32Array([0]));
		GPU.device.queue.writeBuffer(this.uniformBuffer, 116, new Uint32Array([0]));
			
		let textureWidth = 1;
		if(rawTexture != undefined)
		{
			textureWidth = Math.sqrt(rawTexture.length/4);
			GPU.device.queue.writeBuffer(this.uniformBuffer, 112, new Uint32Array([1]));
		}
		else
		{
			rawTexture = new Uint8Array([255, 0, 0, 255]);
		}

		this.textureObj = GPU.device.createTexture({
			size: [textureWidth, textureWidth],
			format: 'rgba8unorm',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
		});
		GPU.device.queue.writeTexture(
			{texture: this.textureObj},					
			rawTexture,
			{bytesPerRow: textureWidth*4},
			{width: textureWidth, height: textureWidth},
		);
						
		let normalMapWidth = 1;
		if(normalMap != undefined)
		{
			GPU.device.queue.writeBuffer(this.uniformBuffer, 116, new Uint32Array([1]));
			normalMapWidth = Math.sqrt(normalMap.length/4);
		}
		else
		{
			normalMap = new Uint8Array([255, 0, 0, 255]);
		}

		//console.log("normal map width: " + normalMapWidth);
		this.normalTextureObj = GPU.device.createTexture({
			size: [normalMapWidth, normalMapWidth],
			format: 'rgba8unorm',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
		});					
		GPU.device.queue.writeTexture(
			{texture: this.normalTextureObj},
			normalMap,
			{bytesPerRow: normalMapWidth*4},
			{width: normalMapWidth, height: normalMapWidth},
		);
	}					
	
	Update()
	{
		console.error(this.name +" update() is NOT IMPLEMENTED!");
	}

	Render(commandPass)
	{
		console.error(this.name + " render() is NOT IMPLEMENTED!");
	}	

	SetParent(parent)
	{					
		this.parent = parent;
		parent.directChildren.push(this);
	}

	TranslationMatrix(translation)
	{																	
		var translationM = [
				[1,0,0,translation[0]],
				[0,1,0,translation[1]],
				[0,0,1,translation[2]],
				[0, 0, 0, 1],
			];
			return translationM;
	}

	PrintVertices(vertexes)
	{					
		let output = [];
		for(let i = 0; i < vertexes.length; i++)
		{
			output.push(vertexes[i]);										
			if(output.length == 6)
			{
				console.log(output)					
				output = [];
			}
		}
	}

	RotationMatrix(rotation)
	{						
		var c = math.cos(rotation);
		var s = math.sin(rotation);

		var rotX = [
				[1.0, 0.0, 0.0, 0.0],
				[0.0, c[0], -s[0], 0.0],
				[0.0, s[0], c[0], 0.0],
				[0.0, 0.0, 0.0, 1.0],
			];

		var rotY = [
			[c[1], 0.0, s[1], 0.0],
			[0.0, 1.0, 0.0, 0.0],
			[-s[1], 0.0, c[1], 0.0],
			[0.0, 0.0, 0.0, 1.0],
		];

		var rotZ = [
				[c[2], -s[2], 0.0, 0.0],
				[s[2], c[2], 0.0, 0.0],
				[0.0, 0.0, 1.0, 0.0],
				[0.0, 0.0, 0.0, 1.0],
			];
	
		var rotXY = math.multiply(rotX, rotY);						
		var rotM = math.multiply(rotXY, rotZ);						
		return rotM;
	}

	ScaleMatrix(scale)
	{				
		var scaleM = [
				[scale[0], 0.0, 0.0, 0.0],
				[0.0, scale[1], 0.0, 0.0],
				[0.0, 0.0, scale[2], 0.0],
				[0.0, 0.0, 0.0, 1.0],
			];
			return scaleM;
	}

	GetVerticeArray(verticeNum)
	{
		let verticeArr = [];
		for(let i = (verticeNum-1)*6; i < (verticeNum-1)*6 + 6; i++)
		{
			verticeArr.push(this.vertices[i]);
		}
		return verticeArr;
	}
	
}

class Light extends GameObject
{
	constructor(pos, rot, scale)
	{
		super(pos, rot, scale);
		this.pos[3] = 1;
		this.color = [1, 0.5, 0.5, 1];
		this.specularity = 50.0;
		this.ambientLight = 0.65;

		this.spinCenter = [0,0,0];
				
		this.pLightGroup = GPU.device.createBindGroup
		({
			layout: GPU.pipeline.getBindGroupLayout(0),
			label: "spotLight",
			entries: 
			[				
				{ binding: 0, resource: { buffer: GPU.dummyUniformBuffer}},
				{ binding: 1, resource: { buffer: GPU.lightBuffer}},					
			],
		});

		GPU.numLights++;
		if(GPU.numLights == 1)
		{
			//for ComplexLightSystem
			GPU.device.queue.writeBuffer(GPU.lightBuffer, 0, new Float32Array([this.ambientLight]));
			GPU.device.queue.writeBuffer(GPU.lightBuffer, 4, new Float32Array([this.specularity]));
			
			GPU.device.queue.writeBuffer(GPU.lightBuffer, 20, new Uint8Array(336));
			GPU.device.queue.writeBuffer(GPU.lightBuffer, 352, new Uint8Array(480));
			GPU.device.queue.writeBuffer(GPU.lightBuffer, 832, new Uint8Array(320));
		}
				
		GPU.device.queue.writeBuffer(GPU.lightBuffer, 8, new Uint32Array([GPU.numLights]));
	}	
}