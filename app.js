THREE = require('three-js')()
var unfold = require('./')(THREE)
var scene = new THREE.Scene();

// Create a basic perspective camera
var camera = new THREE.PerspectiveCamera( 90, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.z = 3;
camera.position.y = -3;
camera.rotation.x = Math.PI/6
// Create a renderer with Antialiasing
var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

// Configure renderer clear color
renderer.setClearColor("#000000");

// Configure renderer size
renderer.setSize( window.innerWidth, window.innerHeight );

// Append Renderer to DOM
document.body.appendChild( renderer.domElement );

//Create a DirectionalLight and turn on shadows for the light
const light2 = new THREE.DirectionalLight( 0xffffff, 1, 100 );
light2.position.set( 0, -10, 10 ); //default; light shining from top
light2.castShadow = true; // default false
scene.add( light2 );

// Create a Cube Mesh with basic material
var geometry = new THREE.ConeGeometry( 1, 2, 6 );
//var geometry = new THREE.TetrahedronGeometry( 1, 1 );
//var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshPhongMaterial( { color: "#433F81" } );
var cube = new THREE.Mesh( geometry, material );
cube.castShadow = true

var adjacent = unfold.adjacent(cube.geometry)

var u_geometry = unfold.separateFaces(geometry) //new THREE.BoxGeometry( 1, 1, 1 ))
console.log(adjacent)

//console.log(u_geometry)
var u_material = new THREE.MeshStandardMaterial( { color: "#433F81" } );
u_material.wireframe = true
material.wireframe = true
var u_cube = new THREE.Mesh( u_geometry, u_material );
u_cube.castShadow = true
//material.wireframe = true

//scene.add( cube );

scene.add(cube = u_cube )

geometry.colorsNeedUpdate = true;

var up = new THREE.Vector3(0,0,1)
var g = u_geometry
var edges = ['a', 'b', 'c']
var min = Math.min, max = Math.max
unfold.traverse(geometry, adjacent, function (i, j) {
//  console.log('face:', i, 'from:', j)
  //which vertices in common?
  //skip if it's the first face
  //move this face so that it is horizontal
  unfold.rotateFace(u_geometry, i, up)
  if(!~j) {
    return
  }
  var f = geometry.faces[i]
  var g = geometry.faces[j]
  var vertices = geometry.vertices
  var u_vertices = u_geometry.vertices
  var u_faces = u_geometry.faces
  for(var k = 0; k < 3; k++)
    for(var l = 0; l < 3; l++) {
      var A1 = f[edges[k]]
      var A2 = f[edges[(k+1) % 3]]
      var B1 = g[edges[l]]
      var B2 = g[edges[(l+1) % 3]]
      //hmm, it looks like min/max arn't needed.
      //between two faces the vertices in a matching edge are always the opposite direction.
      //i.a,i.b is the same edge as j.a,j.b then vertices[i.a] == vertices[j.b]
      if(min(A1, A2) == min(B1, B2) && max(A1,A2) == max(B1, B2)) {
        console.log('face:', i, [A1, A2], [B1, B2], edges[k]+edges[(k+1)%3], edges[l]+edges[(l+1)%3])
//        console.log([vertices[A1], vertices[A2]])
//        console.log(u_vertices[A2].clone().sub(u_vertices[A1]))
//        console.log(u_vertices[B1].clone().sub(u_vertices[B2]))
        //rotate face[i] so that A1,A2 is along B1,B2 (hmm, seems to be already rotated!?)

        
        
        //then translate so that they are in the same position too.
        //var q = new THREE.Quaternion().setFromUnitVectors(

        //translation from B2 to A1
//        return

        var O1 = u_vertices[u_faces[i][edges[k]]]
        var O2 = u_vertices[u_faces[i][edges[(k+1) % 3]]]
        var P1 = u_vertices[u_faces[j][edges[l]]]
        var P2 = u_vertices[u_faces[j][edges[(l+1)%3]]]
        var q = new THREE.Quaternion().setFromUnitVectors(
          O1.clone().sub(O2).normalize(),
          P2.clone().sub(P1).normalize()
        )
//        console.log('angle', O1.clone().sub(O2).dot(P2.clone().sub(P1)))
        
        u_vertices[u_faces[i].a].applyQuaternion(q)
        u_vertices[u_faces[i].b].applyQuaternion(q)
        u_vertices[u_faces[i].c].applyQuaternion(q)
        
        var t = P1.clone().sub(O2)
        //var t = u_vertices[A1].clone().sub(u_vertices[B2])
        console.log(t)
        u_vertices[u_faces[i].a].add(t)
        u_vertices[u_faces[i].b].add(t)
        u_vertices[u_faces[i].c].add(t)
      }
    }

})
u_geometry.vertices.forEach((v, i) => v.z = 0)

u_geometry.computeFaceNormals()
//for(var i = 0; i < g.faces.length; i++)
  //unfold.rotateFace(g, i, up)

//console.log(cube)

/*
const light = new THREE.HemisphereLight( 0xffffff, 0x080808, 1.5 );
light.position.set( - 1.25, 0, 10.25 );
scene.add( light );
*/
var speed = 0.01
// Render Loop

var frame = 1/60
var _ts = performance.now() / 1000
;(function render () {

  requestAnimationFrame( render );
  //cube = line
//  cube.rotation.x += speed;
 // cube.rotation.y += speed;
  cube.rotation.z += -speed;
  
  // Render the scene
  renderer.render(scene, camera);
})();
