const { entries, fromEntries, keys } = Object

 const APIGATEWAY_INTEGRATION_TYPE_HTTP_PROXY = 'HTTP_PROXY'
 const APIGATEWAY_TYPE_INTEGRATION = 'AWS::ApiGatewayV2::Integration'
 const APIGATEWAY_TYPE_ROUTE = 'AWS::ApiGatewayV2::Route'

 function getApiGatewayTemplateObjects(resources) {
   const Resources = resources && resources.Resources

   if (!Resources) {
     return {}
   }

   const integrationObjects = []
   const routeObjects = []

   entries(Resources).forEach(([key, value]) => {
     const resourceObj = value || {}
     const keyValuePair = [key, resourceObj]

     const { Type } = resourceObj

     if (Type === APIGATEWAY_TYPE_INTEGRATION) {
       integrationObjects.push(keyValuePair)
     } else if (Type === APIGATEWAY_TYPE_ROUTE) {
       routeObjects.push(keyValuePair)
     }
   })

   return {
     integrationObjects: fromEntries(integrationObjects),
     routeObjects: fromEntries(routeObjects),
   }
 }

 function parseTarget(Target = {}) {
   const [glue, parts = []] = Target['Fn::Join'] || []
   const [_, target] = parts
   if (typeof target !== 'object') return target
   return target.Ref
 }

 function parseJoin(attribute) {
   if (typeof attribute !== 'object' || !attribute['Fn::Join']) return attribute
   const [glue, elems] = attribute['Fn::Join']
   return elems.join(glue)
 }

 function constructHapiInterface(integrationObjects, routeObjects, routeId) {
   // returns all info necessary so that routes can be added in index.js
   const routeObject = routeObjects[routeId]
   const integrationId = parseTarget(routeObject.Properties.Target)
   const Integration = integrationObjects[integrationId]

   let proxyUri
   if (Integration.Properties.IntegrationType === APIGATEWAY_INTEGRATION_TYPE_HTTP_PROXY) {
     proxyUri = parseJoin(Integration.Properties.IntegrationUri)
   }

   const routeKey = routeObject.Properties.RouteKey
   const [method, pathResource] = routeKey.split(' ')
   return {
     isProxy: !!proxyUri,
     method,
     pathResource,
     proxyUri,
   }
 }

 export default function parseHttpResources(resources) {
   const { integrationObjects, routeObjects } = getApiGatewayTemplateObjects(resources)

   return fromEntries(
     keys(routeObjects).map((key) => [
       key,
       constructHapiInterface(integrationObjects, routeObjects, key),
     ]),
   )
 }
 