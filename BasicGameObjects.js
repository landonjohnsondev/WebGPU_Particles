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
		{
			this.scale = [1,1,1];
			this.localScale = [1,1,1];
		}
		else
		{
			this.scale = [ scale[0], scale[1], scale[2] ];				
			this.localScale = [ scale[0],scale[1],scale[2] ];
		}

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
		this.collisionRadius = 1.0;
		this.vel = [0,0,0];
		this.angVel = [0,0,0];
		this.name = "default";
		this.id = 0;
		this.prefab;
		this.transform = new Transform();		

		this.uniformBufferSize = 290;
		this.uniformBuffer = GPU.device.createBuffer({
			label: 'uniformBuffer',
			size: this.uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});			

		//initialize resolution
		GPU.device.queue.writeBuffer(this.uniformBuffer, 168, new Float32Array([(window.innerHeight/window.innerWidth)]));
	}

	GetCollisionRadius()
	{		
		var rightmostX = -9999;
		for(let i = 0; i < this.vertices.length; i += GPU.vertexStride)
		{
			if(this.vertices[i] > rightmostX)			
				rightmostX = this.vertices[i];
		}		
		this.ApplySceneGraph();		
		return rightmostX * this.scale[0];
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
		
		GPU.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([
			this.worldMatrix[0][0],this.worldMatrix[1][0],this.worldMatrix[2][0],this.worldMatrix[3][0],
			this.worldMatrix[0][1],this.worldMatrix[1][1],this.worldMatrix[2][1],this.worldMatrix[3][1],
			this.worldMatrix[0][2],this.worldMatrix[1][2],this.worldMatrix[2][2],this.worldMatrix[3][2],
			this.worldMatrix[0][3],this.worldMatrix[1][3],this.worldMatrix[2][3],this.worldMatrix[3][3],
		]));				
										
		GPU.device.queue.writeBuffer(this.uniformBuffer, 120, new Float32Array([this.timer]));

		//write performancePercentage to shader		
		//GPU.device.queue.writeBuffer(this.uniformBuffer, 180, new Float32Array([performancePercentage]));
		
		commandPass.setVertexBuffer(0, this.vertexBuffer);
		var numVertices = this.vertices.length / GPU.vertexStride;
		commandPass.draw(numVertices,1,0,0);
	}

	BottomY()
	{
		if(this.bottomY == undefined)
			return undefined;

		return this.pos[1] + this.bottomY;
	}

	TopY()
	{
		if(this.topY == undefined)
			return undefined;

		return this.pos[1] + this.topY;
	}

	LeftX()
	{
		if(this.leftX == undefined)
			return undefined;

		return this.pos[0] + this.leftX;
	}

	RightX()
	{
		if(this.rightX == undefined)
			return undefined;

		return this.pos[0] + this.rightX;
	}

	FarZ()
	{
		if(this.farZ == undefined)
			return undefined;

		return this.pos[2] + this.farZ;
	}

	NearZ()
	{
		if(this.nearZ == undefined)
			return undefined;

		return this.pos[2] + this.nearZ;
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

	XZDistance(vector1, vector2)
	{	
		let dist = 0.0;
		dist += math.pow(vector1[0] - vector2[0], 2);		
		dist += math.pow(vector1[2] - vector2[2], 2);
		dist = math.sqrt(dist);
		return dist;
	}

	//not used atm. would be for a faster collision checking system
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

	LeftStickX()
	{
		if(GPU.controller == undefined)
			return 0.0;
		return GPU.controller.axes[0];
	}

	LeftStickY()
	{
		if(GPU.controller == undefined)
			return 0.0;
		return GPU.controller.axes[1] * -1;
	}

	RightStickX()
	{
		if(GPU.controller == undefined)
			return 0.0;
		return GPU.controller.axes[2];
	}

	RightStickY()
	{
		if(GPU.controller == undefined)
			return 0.0;
		return GPU.controller.axes[3] * -1;
	}
	
	LeftTriggerHeld()
	{
		if(GPU.controller == undefined)
			return false;
		return GPU.controller.buttons[6].pressed;
	}

	RightTriggerHeld()
	{
		if(GPU.controller == undefined)
			return false;
		return GPU.controller.buttons[7].pressed;
	}

	LeftDpadHeld()
	{
		if(GPU.controller == undefined)	
			return false;
		return GPU.controller.buttons[14].pressed;
	}

	RightDpadHeld()
	{
		if(GPU.controller == undefined)	
			return false;
		return GPU.controller.buttons[15].pressed;
	}

	UpDpadHeld()
	{
		if(GPU.controller == undefined)	
			return false;
		return GPU.controller.buttons[12].pressed;
	}

	DownDpadHeld()
	{
		if(GPU.controller == undefined)	
			return false;
		return GPU.controller.buttons[13].pressed;
	}

	AHeld()
	{
		if(GPU.controller == undefined)	
			return false;

		const A = GPU.controller.buttons[0];
		if(A.pressed)
			return true;
		return false;						
	}

	BHeld()
	{
		if(GPU.controller == undefined)	
			return false;

		const B = GPU.controller.buttons[1];
		if(B.pressed)
			return true;
		return false;		
	}

	XHeld()
	{
		if(GPU.controller == undefined)	
			return false;

		const X = GPU.controller.buttons[2];
		if(X.pressed)
			return true;
		return false;		
	}

	YHeld()
	{
		if(GPU.controller == undefined)	
			return false;

		const Y = GPU.controller.buttons[3];
		if(Y.pressed)
			return true;
		return false;		
	}

	CheckCollision(obj1, pos1, obj2, pos2)
	{
		//adjust collision boundaries to be in world space

		//for collision at any angle, get the camera's vertices, then vertice pair for each edge
		//get slope between the pair, then for each of the other object's vertices, check if the edge equation at that x is greater
		//also check that the lower edge is less at that x. if so, the vertice is between the two edges and colliding
		//use -reciprocal for other edge equations

		//these boundaries do not use rotation, so nonuniform meshes have jank collision
		//get min/max x/y after changing to world space and applying rot?
		var obj1LeftX = obj1.leftX + pos1[0];
		var obj1RightX = obj1.rightX + pos1[0];

		var obj1TopY = obj1.topY + pos1[1];
		var obj1BottomY = obj1.bottomY + pos1[1];

		var obj1FarZ = obj1.farZ + pos1[2];
		var obj1NearZ = obj1.nearZ + pos1[2];

		var obj2LeftX = obj2.leftX + pos2[0];
		var obj2RightX = obj2.rightX + pos2[0];

		var obj2TopY = obj2.topY + pos2[1];
		var obj2BottomY = obj2.bottomY + pos2[1];

		var obj2FarZ = obj2.farZ + pos2[2];
		var obj2NearZ = obj2.nearZ + pos2[2];	

		let xOverlap = (obj1LeftX < obj2RightX && obj1RightX > obj2LeftX);
		let yOverlap = (obj1BottomY < obj2TopY && obj1TopY > obj2BottomY);
		let zOverlap = (obj1NearZ < obj2FarZ && obj1FarZ > obj2NearZ);		
		
		if(xOverlap && yOverlap && zOverlap)					
			return true;		
		return false;
	}
				
	//stops an object immediately when it hits something
	Move()
	{
		var newX = [0,0,0];
		var newZ = [0,0,0];
		var newY = [0,0,0];
		for(var i = 0; i < 3; i++)
		{
			this.rot[i] += this.angVel[i];
			newX[i] = this.pos[i];
			newY[i] = this.pos[i];
			newZ[i] = this.pos[i];
		}

		newX[0] += this.vel[0];		
		newY[1] += this.vel[1];
		newZ[2] += this.vel[2];

		var objectHit = undefined;

		//means this is a Solid, but it is always true for all objects currently
		if(!this.isTrigger)
		{
			var clearX = true;			
			var clearY = true;
			var clearZ = true;


			if(!(this instanceof Camera))
			{
				if(this.CheckCollision(this, newX, GPU.camera, GPU.camera.pos))
				{
					objectHit = GPU.camera;					
					clearX = false;
					clearZ = false;
				}

				if(this.CheckCollision(this, newY, GPU.camera, GPU.camera.pos))
				{
					objectHit = GPU.camera;								
					clearY = false;
				}

				if(this.CheckCollision(this, newZ, GPU.camera, GPU.camera.pos))
				{
					objectHit = GPU.camera;
					clearX = false;
					clearZ = false;
				}
			}

			for(var so in GPU.Solid)
			{
				if(GPU.Solid[so] == this)
					continue;				
				
				if(this.CheckCollision(this, newX, GPU.Solid[so], GPU.Solid[so].pos))
				{					
					objectHit = GPU.Solid[so];

					clearX = false;					
					clearZ = false;
					GPU.Solid[so].OnObjectStay(this);
					
					//console.log("tnt x collision with " + so);
				}

				if(this.CheckCollision(this, newZ, GPU.Solid[so], GPU.Solid[so].pos))
				{
					objectHit = GPU.Solid[so];

					clearZ = false;					
					clearX = false;
					GPU.Solid[so].OnObjectStay(this);

					//console.log("tnt z collision with " + so);
				}

				if(this.CheckCollision(this, newY, GPU.Solid[so], GPU.Solid[so].pos))
				{
					objectHit = GPU.Solid[so];

					clearY = false;
					this.grounded = true;
					this.vel[1] = 0;
					GPU.Solid[so].OnObjectStay(this);

					//console.log("tnt y collision with " + so);
				}
			}			
						
			//check each dimension separately to allow sliding on certain dimension
			if(clearX)		
				{
					//console.log("moving tnt x");	
				this.localPos[0] = newX[0];
				}
			if(clearY)
			{
				//console.log("moving tnt y");
				this.localPos[1] = newY[1];
			}
			if(clearZ)
			{
				//console.log("moving tnt x");	
				this.localPos[2] = newZ[2];
			}
			//this.pos = this.localPos;
		}
		//object moving is a trigger
		else
		{			
			this.localPos[0] += this.vel[0];			
			this.localPos[1] += this.vel[1];						
			this.localPos[2] += this.vel[2];

			for(var tr in GPU.Trigger)
			{
				if(GPU.Trigger[tr] == this)
					continue;

				// if(this.CheckCollision(this, this.localPos, GPU.Trigger[tr], GPU.Trigger[tr].pos))
				// 	GPU.Trigger[tr].OnTriggerStay(this);
			}			
		}

		return objectHit;
	}

	InitExplodePositions()
	{					
		let initialOffset = GPU.explodePosInitialOffset;		
		for(let i = 0; i < GPU.numExplodePositions; i++)
		{			
			if(GPU.explodePos[i] != undefined)										
				GPU.device.queue.writeBuffer(this.uniformBuffer, initialOffset + (16 * i), new Float32Array(GPU.explodePos[i]));						
			else														
				GPU.device.queue.writeBuffer(this.uniformBuffer, initialOffset + (16 * i), new Float32Array([9999,9999,9999, 1]));			
		}			
	}

	Between(num, low, high)
	{
		if(num >= low && num <= high)
			return true;
		return false;
	}

	//if an object hits something, move along the axes that are still movable
	MoveAndSlide(ignoreCollison, standingOnCrater)
	{
		var newX = [0,0,0];
		var newZ = [0,0,0];
		var newY = [0,0,0];
		for(var i = 0; i < 3; i++)
		{
			this.rot[i] += this.angVel[i];
			newX[i] = this.pos[i];
			newY[i] = this.pos[i];
			newZ[i] = this.pos[i];
		}		
		
		// console.log("standingOnCrater: " + standingOnCrater);
		// console.log("ignoreCollision: " + ignoreCollison);		

		if(standingOnCrater && this.vel[1] < 0)
		{			
			this.vel[1] = 0;
			var adjustedY = [ this.pos[0] + this.vel[0], 0, this.pos[2] + this.vel[2] ];
			this.grounded = true;
			
			//get xz distance from center as formula "x"
			var levelCraterPos = [ this.closestCraterPos[0], this.closestCraterPos[1], this.closestCraterPos[2] ];	
			levelCraterPos[1] = this.pos[1];			
			var xzDistToCrater = this.VectorDistance(this.pos, levelCraterPos);					
			//prevent sqrt from being invalid	
			xzDistToCrater = math.min(xzDistToCrater, 8);			

			adjustedY[1] = this.closestCraterPos[1] - math.sqrt(64 - xzDistToCrater**2);			
			adjustedY[1] += 1*this.heightSide;			
									
			this.localPos = [ adjustedY[0], adjustedY[1], adjustedY[2] ];
			//KEEP IN MIND THIS MEANS YOU NEVER COLLIDE WITH OTHER OBJECTS WHILE IN THE CRATER
			return;
		}
		//if not standing on crater (dist under crater), need to prevent camera from colliding with ground when exiting crater, how?
		//else if camera world space bottom y is under ground y, ignore collision? then you fall through

		newX[0] += this.vel[0];		
		newY[1] += this.vel[1];
		newZ[2] += this.vel[2];
		
		if(ignoreCollison)
		{			
			this.localPos[0] += this.vel[0];
			this.localPos[1] += this.vel[1];
			this.localPos[2] += this.vel[2];
			//no collided object
			return undefined;
		}		

		var objHit = undefined;		

		//means this is a Solid, but it is always true for all objects currently
		if(!this.isTrigger)
		{
			var clearX = true;			
			var clearY = true;
			var clearZ = true;
			for(var so in GPU.Solid)
			{
				if(GPU.Solid[so] == this)
					continue;		

				//ground
				if(GPU.Solid[so].id == "ID23")
				{
					//console.log("ground topY: " + (GPU.Solid[so].pos[1] + GPU.Solid[so].topY));
				}

				//allows jumping while in crater
				if((GPU.Solid[so] instanceof Grass) && standingOnCrater)									
					continue;				
				
				if(this.CheckCollision(this, newX, GPU.Solid[so], GPU.Solid[so].pos))
				{
					objHit = GPU.Solid[so];
					GPU.Solid[so].OnObjectStay(this);
					clearX = false;
				}

				if(this.CheckCollision(this, newZ, GPU.Solid[so], GPU.Solid[so].pos))				
				{
					objHit = GPU.Solid[so];
					GPU.Solid[so].OnObjectStay(this);
					clearZ = false;
				}

				if(this.CheckCollision(this, newY, GPU.Solid[so], GPU.Solid[so].pos))
				{
					objHit = GPU.Solid[so];				
					GPU.Solid[so].OnObjectStay(this);					

					clearY = false;
					this.grounded = true;
					this.vel[1] = 0;
				}
			}			
						
			//check each dimension separately to allow sliding on certain dimension
			if(clearX)			
				this.localPos[0] = newX[0];			
			if(clearY)			
				this.localPos[1] = newY[1];														
			if(clearZ)
				this.localPos[2] = newZ[2];
		}

		for(var tr in GPU.Trigger)
		{
			if(GPU.Trigger[tr] == this)
				continue;

			if(this.CheckCollision(this, this.localPos, GPU.Trigger[tr], GPU.Trigger[tr].pos))			
				GPU.Trigger[tr].OnObjectStay(this);	
		}		
		return objHit;
	}

	OnObjectStay(obj)
	{
		//basically OnCollisionStay from Unity, you can override this for each class
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
		
		//global x scale is the length of the xVector (the first column of the matrix), y for second column, z for third column
		var xScale = math.hypot(this.worldMatrix[0][0], this.worldMatrix[1][0], this.worldMatrix[2][0]);
		var yScale = math.hypot(this.worldMatrix[0][1], this.worldMatrix[1][1], this.worldMatrix[2][1]);
		var zScale = math.hypot(this.worldMatrix[0][2], this.worldMatrix[1][2], this.worldMatrix[2][2]);
		//worst case if scale messes up, use uniform-ish scale
		// if(math.isNaN(xScale))
		// 	xScale = zScale;
		// if(math.isNaN(yScale))
		// 	yScale = zScale;
		// if(math.isNaN(zScale))
		// 	zScale = xScale;
		
		this.scale = [ xScale, yScale, zScale ];
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
		this.ambientLight = 0.02;

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

		//account for itself with + 1
		var numLights = GPU.GetObjectsOfType(Light).length + 1;
		if(numLights == 1)
		{
			console.log("initialize light stuff");
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