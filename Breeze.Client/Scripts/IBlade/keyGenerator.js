﻿
define(["core", "config", "entityMetadata", "entityAspect"],
function (core, a_config, m_entityMetadata, m_entityAspect) {
    "use strict";
    
    /**
    @module breeze
    **/
    
    var DataType = m_entityMetadata.DataType;
    var EntityKey = m_entityAspect.EntityKey;

    
    /*
    @class KeyGenerator
    */
    var ctor = function () {
        // key is dataProperty.name + || + entityType.name, value is propEntry 
        // propEntry = { entityType, propertyName, keyMap }
        // keyMap has key of the actual value ( as a string) and a value of null or the real id.
        this._tempIdMap = {};

        this.nextNumber = -1;
        this.nextNumberIncrement = -1;
        this.stringPrefix = "K_";
    };

    /*
    Returns a unique 'temporary' id for the specified {{#crossLink "EntityType"}}{{/crossLink}}. 
    Uniqueness is defined for this purpose as being unique within each instance of a KeyGenerator. This is sufficient 
    because each EntityManager will have its own instance of a KeyGenerator and any entities imported into
    the EntityManager with temporary keys will have them regenerated and remapped on import.

        The return value of this method must be of the correct type as determined by the 
    @example
        // Assume em1 is a preexisting EntityManager
        var custType = em1.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        // next line both sets cust1's 'CustomerId' property but also returns the value
        var cid1 = em1.generateTempKeyValue(cust1);
        em1.saveChanges()
            .then( function( data) {
                var sameCust1 = data.results[0];
                // cust1 === sameCust1;
                // but cust1.getProperty("CustomerId") != cid1
                // because the server will have generated a new id 
                // and the client will have been updated with this 
                // new id.
            })
    @method generateTempKeyValue
    @param entityType {EntityType}
    */
    ctor.prototype.generateTempKeyValue = function (entityType) {
        var keyProps = entityType.keyProperties;
        if (keyProps.length > 1) {
            throw new Error("Ids can not be autogenerated for entities with multipart keys");
        }
        var keyProp = keyProps[0];
        var nextId = getNextId(this, keyProp.dataType);
        var propEntry = getPropEntry(this, keyProp, true);
        propEntry.keyMap[nextId.toString()] = null;
        return nextId;
    };

    ctor.prototype.getTempKeys = function () {
        var results = [];
        for (var key in this._tempIdMap) {
            var propEntry = this._tempIdMap[key];
            var entityType = propEntry.entityType;
            // var propName = propEntry.propertyName;
            for (var keyValue in propEntry.keyMap) {
                results.push(new EntityKey(entityType, [keyValue]));
            }
        }
        return results;
    };


    // proto methods below are not part of the KeyGenerator interface.

    ctor.prototype.isTempKey = function (entityKey) {
        var keyProps = entityKey.entityType.keyProperties;
        if (keyProps.length > 1) return false;
        var keyProp = keyProps[0];
        var propEntry = getPropEntry(this, keyProp);
        if (!propEntry) {
            return false;
        }
        return (propEntry.keyMap[entityKey.values[0].toString()] !== undefined);
    };



    function getPropEntry(that, keyProp, createIfMissing) {
        var key = keyProp.name + ".." + keyProp.parentEntityType.name;
        var propEntry = that._tempIdMap[key];
        if (!propEntry) {
            if (createIfMissing) {
                propEntry = { entityType: keyProp.parentEntityType, propertyName: keyProp.name, keyMap: {} };
                that._tempIdMap[key] = propEntry;
            }
        }
        return propEntry;
    }

    function getNextId(that, dataType) {
        if (dataType.isNumeric) {
            return getNextNumber(that);
        }

        if (dataType === DataType.String) {
            return this.stringPrefix + getNextNumber(that).toString();
        }

        if (dataType === DataType.Guid) {
            return core.getUuid();
        }

        if (dataType === DataType.DateTime) {
            return Date.now();
        }

        throw new Error("Cannot use a property with a dataType of: " + dataType.toString() + " for id generation");
    }

    function getNextNumber(that) {
        var result = that.nextNumber;
        that.nextNumber += that.nextNumberIncrement;
        return result;
    }

    a_config.registerType(ctor, "KeyGenerator");

    return ctor;
});
