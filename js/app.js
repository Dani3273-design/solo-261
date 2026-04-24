// 3D 流水线场景
(function() {
    // 全局变量
    let scene, camera, renderer;
    let conveyorBelt, manipulators = [], part;
    let partState = 'MOVING_TO_FIRST'; // 零件状态
    let partPosition = { x: -12, y: 0.6, z: 0 };
    let currentManipulator = 0;
    let animationTime = 0;
    let hasEars = false, hasSmile = false, hasBody = false;
    
    // 零件组件
    let partBase, partLeftEar, partRightEar, partSmile, partBody;
    
    // 机械手组件引用
    let manipulatorComponents = [];
    
    // 初始化
    init();
    animate();
    
    function init() {
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        
        // 创建相机
        camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
        camera.position.set(0, 15, 20);
        camera.lookAt(0, 0, 0);
        
        // 创建渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(800, 600);
        renderer.shadowMap.enabled = true;
        document.getElementById('container').appendChild(renderer.domElement);
        
        // 添加灯光
        addLights();
        
        // 创建传送带
        createConveyorBelt();
        
        // 创建3个机械手
        createManipulators();
        
        // 创建三角形零件
        createPart();
    }
    
    function addLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        // 方向光（主光源）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // 点光源
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 10, 5);
        scene.add(pointLight);
    }
    
    function createConveyorBelt() {
        // 传送带主体（深色）
        const beltGeometry = new THREE.BoxGeometry(30, 0.5, 6);
        const beltMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 100
        });
        conveyorBelt = new THREE.Mesh(beltGeometry, beltMaterial);
        conveyorBelt.position.y = -0.25;
        conveyorBelt.receiveShadow = true;
        scene.add(conveyorBelt);
        
        // 传送带支架
        const supportGeometry = new THREE.BoxGeometry(0.5, 2, 0.5);
        const supportMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        
        const supportPositions = [
            { x: -14, z: -2.5 },
            { x: -14, z: 2.5 },
            { x: 14, z: -2.5 },
            { x: 14, z: 2.5 }
        ];
        
        supportPositions.forEach(pos => {
            const support = new THREE.Mesh(supportGeometry, supportMaterial);
            support.position.set(pos.x, -1.5, pos.z);
            support.castShadow = true;
            support.receiveShadow = true;
            scene.add(support);
        });
    }
    
    function createManipulators() {
        const manipulatorPositions = [-6, 0, 6];
        
        manipulatorPositions.forEach((posX, index) => {
            const manipulator = createManipulator(index);
            manipulator.position.x = posX;
            manipulators.push(manipulator);
            scene.add(manipulator);
            
            // 存储组件引用
            manipulatorComponents.push({
                base: manipulator.children[0],
                arm: manipulator.children[1],
                forearm: manipulator.children[2],
                gripper: manipulator.children[3],
                baseHeight: 3,
                armLength: 4,
                forearmLength: 3,
                isProcessing: false,
                processTime: 0
            });
        });
    }
    
    function createManipulator(index) {
        const manipulator = new THREE.Group();
        
        // 底座
        const baseGeometry = new THREE.CylinderGeometry(0.8, 1, 3, 16);
        const baseMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4444aa,
            shininess: 100
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 1.5;
        base.castShadow = true;
        base.receiveShadow = true;
        manipulator.add(base);
        
        // 大臂
        const armGeometry = new THREE.BoxGeometry(0.6, 4, 0.6);
        const armMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x5555bb,
            shininess: 100
        });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.y = 3.5;
        arm.castShadow = true;
        arm.receiveShadow = true;
        manipulator.add(arm);
        
        // 小臂
        const forearmGeometry = new THREE.BoxGeometry(0.5, 3, 0.5);
        const forearmMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x6666cc,
            shininess: 100
        });
        const forearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
        forearm.position.y = 6;
        forearm.castShadow = true;
        forearm.receiveShadow = true;
        manipulator.add(forearm);
        
        // 夹爪
        const gripperGroup = new THREE.Group();
        
        // 夹爪主体
        const gripperBaseGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.5);
        const gripperMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8888dd,
            shininess: 100
        });
        const gripperBase = new THREE.Mesh(gripperBaseGeometry, gripperMaterial);
        gripperBase.position.y = 0;
        gripperGroup.add(gripperBase);
        
        // 左夹爪
        const leftFingerGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.4);
        const leftFinger = new THREE.Mesh(leftFingerGeometry, gripperMaterial);
        leftFinger.position.set(-0.5, -0.9, 0);
        gripperGroup.add(leftFinger);
        
        // 右夹爪
        const rightFinger = new THREE.Mesh(leftFingerGeometry, gripperMaterial);
        rightFinger.position.set(0.5, -0.9, 0);
        gripperGroup.add(rightFinger);
        
        gripperGroup.position.y = 7.5;
        manipulator.add(gripperGroup);
        
        return manipulator;
    }
    
    function createPart() {
        part = new THREE.Group();
        
        // 三角形底座
        const triangleShape = new THREE.Shape();
        triangleShape.moveTo(0, 1);
        triangleShape.lineTo(-0.8, -0.5);
        triangleShape.lineTo(0.8, -0.5);
        triangleShape.lineTo(0, 1);
        
        const extrudeSettings = {
            steps: 1,
            depth: 0.3,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 3
        };
        
        const triangleGeometry = new THREE.ExtrudeGeometry(triangleShape, extrudeSettings);
        const partMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff6600,
            shininess: 50
        });
        
        partBase = new THREE.Mesh(triangleGeometry, partMaterial);
        partBase.rotation.x = Math.PI / 2;
        partBase.castShadow = true;
        partBase.receiveShadow = true;
        part.add(partBase);
        
        // 耳朵（初始隐藏）
        createEars();
        
        // 笑脸（初始隐藏）
        createSmile();
        
        // 身体（初始隐藏）
        createBody();
        
        // 设置初始位置
        part.position.set(partPosition.x, partPosition.y, partPosition.z);
        scene.add(part);
    }
    
    function createEars() {
        const earGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const earMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff8800,
            shininess: 50
        });
        
        // 左耳
        partLeftEar = new THREE.Mesh(earGeometry, earMaterial);
        partLeftEar.position.set(-0.6, 0.8, 0);
        partLeftEar.castShadow = true;
        part.add(partLeftEar);
        partLeftEar.visible = false;
        
        // 右耳
        partRightEar = new THREE.Mesh(earGeometry, earMaterial);
        partRightEar.position.set(0.6, 0.8, 0);
        partRightEar.castShadow = true;
        part.add(partRightEar);
        partRightEar.visible = false;
    }
    
    function createSmile() {
        partSmile = new THREE.Group();
        
        // 笑脸材质
        const smileMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 100
        });
        
        // 左眼
        const eyeGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
        const leftEye = new THREE.Mesh(eyeGeometry, smileMaterial);
        leftEye.rotation.x = Math.PI / 2;
        leftEye.position.set(-0.25, 0.3, 0.18);
        leftEye.castShadow = true;
        partSmile.add(leftEye);
        
        // 右眼
        const rightEye = new THREE.Mesh(eyeGeometry, smileMaterial);
        rightEye.rotation.x = Math.PI / 2;
        rightEye.position.set(0.25, 0.3, 0.18);
        rightEye.castShadow = true;
        partSmile.add(rightEye);
        
        // 嘴巴（圆弧）
        const mouthCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.3, -0.1, 0),
            new THREE.Vector3(-0.15, -0.25, 0),
            new THREE.Vector3(0, -0.3, 0),
            new THREE.Vector3(0.15, -0.25, 0),
            new THREE.Vector3(0.3, -0.1, 0)
        ]);
        
        const mouthGeometry = new THREE.TubeGeometry(mouthCurve, 20, 0.04, 8, false);
        const mouthMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 100
        });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.z = 0.18;
        mouth.castShadow = true;
        partSmile.add(mouth);
        
        partSmile.position.z = 0;
        part.add(partSmile);
        partSmile.visible = false;
    }
    
    function createBody() {
        // 身体（一个更大的三角形或矩形连接到底部）
        const bodyGeometry = new THREE.BoxGeometry(1.6, 0.8, 0.5);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffaa00,
            shininess: 50
        });
        
        partBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        partBody.position.y = -0.9;
        partBody.castShadow = true;
        partBody.receiveShadow = true;
        part.add(partBody);
        partBody.visible = false;
    }
    
    function animate() {
        requestAnimationFrame(animate);
        animationTime += 0.016; // 约60fps
        
        updatePartAnimation();
        updateManipulators();
        rotateBelt();
        
        renderer.render(scene, camera);
    }
    
    function rotateBelt() {
        // 传送带滚动效果（通过材质偏移实现）
        if (conveyorBelt.material) {
            // 这里可以添加纹理偏移，但为了简单起见，我们不添加复杂的纹理
        }
    }
    
    function updatePartAnimation() {
        const beltSpeed = 2; // 传送带速度
        const manipulatorPositions = [-6, 0, 6];
        
        switch(partState) {
            case 'MOVING_TO_FIRST':
                // 移动到第一个机械手
                partPosition.x += beltSpeed * 0.016;
                if (partPosition.x >= manipulatorPositions[0]) {
                    partPosition.x = manipulatorPositions[0];
                    partState = 'AT_FIRST';
                    currentManipulator = 0;
                }
                break;
                
            case 'AT_FIRST':
            case 'AT_SECOND':
            case 'AT_THIRD':
                // 零件在机械手位置，等待抓取
                if (!manipulatorComponents[currentManipulator].isProcessing) {
                    manipulatorComponents[currentManipulator].isProcessing = true;
                    manipulatorComponents[currentManipulator].processTime = 0;
                    partState = 'BEING_LIFTED';
                }
                break;
                
            case 'BEING_LIFTED':
                // 机械手抓取零件（位置由机械手动画控制）
                break;
                
            case 'BEING_PROCESSED':
                // 正在加工
                break;
                
            case 'BEING_PLACED':
                // 机械手放回零件
                break;
                
            case 'MOVING_TO_SECOND':
                partPosition.x += beltSpeed * 0.016;
                if (partPosition.x >= manipulatorPositions[1]) {
                    partPosition.x = manipulatorPositions[1];
                    partState = 'AT_SECOND';
                    currentManipulator = 1;
                }
                break;
                
            case 'MOVING_TO_THIRD':
                partPosition.x += beltSpeed * 0.016;
                if (partPosition.x >= manipulatorPositions[2]) {
                    partPosition.x = manipulatorPositions[2];
                    partState = 'AT_THIRD';
                    currentManipulator = 2;
                }
                break;
                
            case 'MOVING_TO_EXIT':
                partPosition.x += beltSpeed * 0.016;
                if (partPosition.x > 15) {
                    // 重置到起点，循环动画
                    partPosition.x = -12;
                    partState = 'MOVING_TO_FIRST';
                    // 重置零件状态
                    hasEars = hasSmile = hasBody = false;
                    partLeftEar.visible = partRightEar.visible = false;
                    partSmile.visible = false;
                    partBody.visible = false;
                }
                break;
        }
        
        // 更新零件位置（除非正在被抓取）
        if (partState !== 'BEING_LIFTED' && partState !== 'BEING_PROCESSED' && partState !== 'BEING_PLACED') {
            part.position.set(partPosition.x, partPosition.y, partPosition.z);
        }
    }
    
    function updateManipulators() {
        manipulatorComponents.forEach((comp, index) => {
            if (comp.isProcessing) {
                comp.processTime += 0.016;
                const totalProcessTime = 3; // 总处理时间（秒）
                
                // 动画阶段：0-0.5秒下降抓取，0.5-2秒加工，2-2.5秒上升放回
                const grabTime = 0.5;
                const processTime = 1.5;
                const releaseTime = 0.5;
                
                if (comp.processTime < grabTime) {
                    // 下降阶段
                    const progress = comp.processTime / grabTime;
                    const moveDown = progress * 5; // 下降距离
                    
                    // 调整夹爪位置
                    const gripper = comp.gripper;
                    const originalY = 7.5;
                    gripper.position.y = originalY - moveDown;
                    
                    // 当接近零件时，开始夹紧
                    if (progress > 0.7) {
                        const closeProgress = (progress - 0.7) / 0.3;
                        // 左夹爪向右移动，右夹爪向左移动
                        gripper.children[1].position.x = -0.5 + closeProgress * 0.3;
                        gripper.children[2].position.x = 0.5 - closeProgress * 0.3;
                    }
                    
                    // 零件跟随夹爪移动（在抓取后）
                    if (progress > 0.5 && partState === 'BEING_LIFTED') {
                        // 这里不移动零件，保持在传送带上直到抓取完成
                    }
                    
                } else if (comp.processTime < grabTime + processTime) {
                    // 加工阶段
                    const processProgress = (comp.processTime - grabTime) / processTime;
                    
                    // 稍微抬起零件
                    const liftHeight = 2;
                    const gripper = comp.gripper;
                    gripper.position.y = 7.5 - 5 + liftHeight * Math.sin(processProgress * Math.PI);
                    
                    // 零件跟随夹爪
                    if (partState === 'BEING_LIFTED') {
                        partState = 'BEING_PROCESSED';
                    }
                    
                    // 更新零件位置跟随夹爪
                    const manipulatorWorldPos = new THREE.Vector3();
                    manipulators[index].getWorldPosition(manipulatorWorldPos);
                    
                    const gripperWorldPos = new THREE.Vector3();
                    gripper.getWorldPosition(gripperWorldPos);
                    
                    part.position.set(
                        manipulatorWorldPos.x,
                        partPosition.y + liftHeight * Math.sin(processProgress * Math.PI),
                        partPosition.z
                    );
                    
                    // 在加工过程中应用修改
                    if (processProgress > 0.3) {
                        applyModification(index);
                    }
                    
                } else if (comp.processTime < grabTime + processTime + releaseTime) {
                    // 放回阶段
                    const releaseProgress = (comp.processTime - grabTime - processTime) / releaseTime;
                    
                    const gripper = comp.gripper;
                    const currentY = gripper.position.y;
                    const targetY = 7.5;
                    
                    // 上升回原位
                    gripper.position.y = currentY + (targetY - currentY) * releaseProgress;
                    
                    // 零件跟随下降
                    if (partState === 'BEING_PROCESSED') {
                        partState = 'BEING_PLACED';
                    }
                    
                    const manipulatorWorldPos = new THREE.Vector3();
                    manipulators[index].getWorldPosition(manipulatorWorldPos);
                    
                    part.position.set(
                        manipulatorWorldPos.x,
                        partPosition.y + (1 - releaseProgress) * 2,
                        partPosition.z
                    );
                    
                    // 松开夹爪
                    if (releaseProgress > 0.5) {
                        const openProgress = (releaseProgress - 0.5) / 0.5;
                        gripper.children[1].position.x = -0.2 - openProgress * 0.3;
                        gripper.children[2].position.x = 0.2 + openProgress * 0.3;
                    }
                    
                } else {
                    // 加工完成
                    comp.isProcessing = false;
                    
                    // 确保零件回到传送带
                    part.position.set(partPosition.x, partPosition.y, partPosition.z);
                    
                    // 更新状态
                    if (index === 0) {
                        partState = 'MOVING_TO_SECOND';
                    } else if (index === 1) {
                        partState = 'MOVING_TO_THIRD';
                    } else {
                        partState = 'MOVING_TO_EXIT';
                    }
                }
            }
        });
    }
    
    function applyModification(manipulatorIndex) {
        switch(manipulatorIndex) {
            case 0:
                // 第一个机械手：添加耳朵
                if (!hasEars) {
                    hasEars = true;
                    partLeftEar.visible = true;
                    partRightEar.visible = true;
                }
                break;
                
            case 1:
                // 第二个机械手：刻笑脸
                if (!hasSmile) {
                    hasSmile = true;
                    partSmile.visible = true;
                }
                break;
                
            case 2:
                // 第三个机械手：添加身体
                if (!hasBody) {
                    hasBody = true;
                    partBody.visible = true;
                }
                break;
        }
    }
    
})();
