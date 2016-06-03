module.exports = Ellipsoid;

var Shape = require('./Shape');
var Vec3 = require('../math/Vec3');

/**
 * Ellipsoid shape (reference: https://en.wikipedia.org/wiki/Ellipsoid)
 * @class Ellipsoid
 * @constructor
 * @extends Shape
 * @param {Number} a Length of semi-principal x-axis
 * @param {Number} b Length of semi-principal y-axis
 * @param {Number} c Length of semi-principal z-axis
 * @author jzitelli / http://github.com/jzitelli
 */
function Ellipsoid(a, b, c) {
    Shape.call(this);

    /**
     * @property {Number} a
     */
    this.a = a !== undefined ? Number(a) : 1.0;
    /**
     * @property {Number} b
     */
    this.b = b !== undefined ? Number(b) : 1.0;
    /**
     * @property {Number} c
     */
    this.c = c !== undefined ? Number(c) : 1.0;

    this.type = Shape.types.ELLIPSOID;

    if(this.a < 0 || this.b < 0 || this.c < 0){
        throw new Error('The Ellipsoid radius cannot be negative.');
    }

    this.updateBoundingSphereRadius();
}
Ellipsoid.prototype = new Shape();
Ellipsoid.prototype.constructor = Ellipsoid;

Ellipsoid.prototype.calculateLocalInertia = function(mass,target){
    target = target || new Vec3();
    var I_xx = 2.0*mass * this.b * this.c / 5.0;
    var I_yy = 2.0*mass * this.a * this.c / 5.0;
    var I_zz = 2.0*mass * this.b * this.a / 5.0;
    target.x = I_xx;
    target.y = I_yy;
    target.z = I_zz;
    return target;
};

Ellipsoid.prototype.volume = function(){
    return 4.0 * Math.PI * this.a * this.b * this.c / 3.0;
};

Ellipsoid.prototype.updateBoundingSphereRadius = function(){
    this.boundingSphereRadius = Math.max(this.a, this.b, this.c);
};

var rotatedLengthsTemp = new Vec3();
Ellipsoid.prototype.calculateWorldAABB = function(pos,quat,min,max){
    rotatedLengthsTemp.set(this.a, this.b, this.c);
    quat.vmult(rotatedLengthsTemp, rotatedLengthsTemp);
    var a = rotatedLengthsTemp.x,
        b = rotatedLengthsTemp.y,
        c = rotatedLengthsTemp.z;
    min.x = pos.x - a;
    max.x = pos.x + a;
    min.y = pos.y - b;
    max.y = pos.y + b;
    min.z = pos.z - c;
    max.z = pos.z + c;
};
