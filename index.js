module.exports = function (THREE) {
  var exports = {}
  var sqrt = Math.sqrt
  function sq (a) { return a * a }

  //distance between 
  var distance = exports.distance = function (a, b) {
    return sqrt(sq(a.x-b.x) + sq(a.y-b.y) + sq(a.z-b.z))
  }
  //area of a triangle by heron's formula
  function heron (a, b, c) {
    var s = (a + b + c) / 2
    return sqrt(s * (s - a) * (s - b) * (s - c))
  }

  function faceArea (a,b,c) {
  //  console.log('area', a,b,c, distance(a,b), distance(b,c), distance(c,a))
    return heron(distance(a, b), distance(b, c), distance(c, a))
  }

  function midpoint3(a, b, c) {
    return {
      x: (a.x+b.x+c.x)/3,
      y: (a.y+b.y+c.y)/3,
      z: (a.z+b.z+c.z)/3
    }
  }
  function midpoint4(a, b, c, d) {
    return {
      x: (a.x+b.x+c.x+d.x)/4,
      y: (a.y+b.y+c.y+d.y)/4,
      z: (a.z+b.z+c.z+d.z)/4
    }
  }

  //geometric center of a mesh surface
  //if the object is hollow (with thin walls) this is also the center of mass.
  exports.area = function (mesh) {
    //center of each face
    var center = {x:0, y:0, z: 0}, total_area = 0
    var vts = mesh.geometry.vertices
    var faces = mesh.geometry.faces
    for(var i = 0; i < faces.length; i++) {
      var face = faces[i]
      var a = vts[face.a], b = vts[face.b], c = vts[face.c]
      var area = faceArea(a, b, c)
      var face_center = midpoint3(a, b, c)
      center.x += face_center.x * area
      center.y += face_center.y * area
      center.z += face_center.z * area
      total_area += area
    }
    return {x: c.x/total_area, y: c.y/total_area, z: c.z/total_area, area: total_area}
  }

  //TODO implement dot product and cross product

  function sub(a, b) {
    return {x: a.x-b.x, y:a.y-b.y, z:a.z-b.z}
  }

  function cross (a, b) {
    return {
      x: a.y*b.z - b.y*a.z,
      y: a.x*b.z - b.x*a.z,
      z: a.x*b.y - b.x*a.y
    }
  }

  function dot(a, b) {
    return a.x*b.x + a.y*b.y + a.z*b.z
  }

  function tetra_volume (a,b,c,d) {
    // https://www.youtube.com/watch?v=xgGdrTH6WGw
    return Math.abs(dot(cross(sub(a,b), sub(a,c)), sub(a,d)))/6
  }

  exports.volume = function (mesh) {
    var center = {x:0, y:0, z: 0}, total_volume = 0
    var vts = mesh.geometry.vertices
    var faces = mesh.geometry.faces
    for(var i = 0; i < faces.length; i++) {
      var face = faces[i]
      var a = vts[face.a], b = vts[face.b], c = vts[face.c]
      var volume = tetra_volume(c, b, a, mesh.position)
      var v_c = midpoint4(a,b,c,mesh.position)

      center.x += v_c.x * volume
      center.y += v_c.y * volume
      center.z += v_c.z * volume
      total_volume += volume
    }
    return {x: center.x/total_volume, y: center.y/total_volume, z: center.z/total_volume, volume: total_volume}
  }

  exports.adjacent = function (geometry) {
    var faces = geometry.faces
    var face = faces[0]

    //face -> adjacent faces
    var edges = {}
    function edge(a,b) {
      return edges[Math.min(a,b)][Math.max(a,b)]
    }

    function add(a,b, i) {
      var A = Math.min(a,b)
      var B = Math.max(a,b)
      edges[A] = edges[A] || {}
      ;(edges[A][B] = edges[A][B] || []).push(i)
    }

    for(var i = 0; i < faces.length; i++) {
      var face = faces[i]
      add(face.a,face.b, i)
      add(face.b,face.c, i)
      add(face.c,face.a, i)
    }

    return edges 
  }

  exports.traverse = function (geometry, edges, iter) {
    var seen = []
    var faces = geometry.faces
    function edge(a,b) {
      return edges[Math.min(a,b)][Math.max(a,b)]
    }
    ;(function next (i, j) {
      if(seen[i]) return
      else seen[i] = true
      var face = faces[i]
      //iter called with the face index, and the previous face
      iter(i, j)

      var possibles = [
        edge(face.a, face.b)[0],
        edge(face.a, face.b)[1],
        edge(face.b, face.c)[0],
        edge(face.b, face.c)[1],
        edge(face.c, face.a)[0],
        edge(face.c, face.a)[1]
      ]
//      .sort(()=> Math.random() - 0.5)
      .forEach(v => next(v, i))
/*
      next(edge(face.a, face.b)[0], i)
      next(edge(face.a, face.b)[1], i)
      next(edge(face.b, face.c)[0], i)
      next(edge(face.b, face.c)[1], i)
      next(edge(face.c, face.a)[0], i)
      next(edge(face.c, face.a)[1], i)
*/
    })(0, -1)
  }
  //duplicate a geometry, but faces do not share vertices
  //the face indexes match, but adjacent faces will not share vertices
  exports.separateFaces = function (_geometry) {
    var geometry = new THREE.Geometry()
    var vertices = _geometry.vertices
    var faces = _geometry.faces
    function push(item) {
      return geometry.vertices.push(item) - 1
    }
    for(var i = 0; i < faces.length; i++) {
      geometry.faces.push(
        new THREE.Face3(
          push(vertices[faces[i].a].clone()),
          push(vertices[faces[i].b].clone()),
          push(vertices[faces[i].c].clone())
        )
      )
    }
    geometry.computeFaceNormals();
    return geometry
  }

  var m = new THREE.Matrix4()
  var n = new THREE.Matrix4()
  //the normal will a vector pointing up
  //must be passed a split geometry.
  exports.rotateFace = function (geometry, face_i, normal) {
    var face = geometry.faces[face_i]
    var vertices = geometry.vertices
    var q =  new THREE.Quaternion().setFromUnitVectors(face.normal, normal)
    //translate face so A vertice is at origin
    //console.log(vertices[face.a].clone(), vertices[face.a].clone().multiplyScalar(-1))
    var v = vertices[face.a]
    m.makeTranslation(-v.x,-v.y,-v.z)
//    console.log(m)
    //rotate so up is up
  //  m.multiply(n.makeRotationFromQuaternion(q))
    m.multiply(n.makeRotationFromQuaternion(q))

    //rotate so that a-b 
    //  m.multiply(vertices[face.a].copy().sub(vertices[face.b])
//    console.log(m)
    vertices[face.a].applyMatrix4(m)
    vertices[face.b].applyMatrix4(m)
    vertices[face.c].applyMatrix4(m)
    geometry.computeFaceNormals()
    return geometry
  }

  exports.moveFaceAlongEdge = function () {
    
  }
  return exports
}