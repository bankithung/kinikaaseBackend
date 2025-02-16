import { Image } from "react-native"
import utils from "../core/utils"

function Thumbnail({ url, size }) {
	return (
		<Image 
			source={utils.thumbnail(url)}
			style={{ 
				width: size, 
				height: size, 
				borderRadius: size / 2,
				backgroundColor: '#e0e0e0' 
			}}
		/>
	)
}

export default Thumbnail
// import React from "react";
// import FastImage from "react-native-fast-image";
// import utils from "../core/utils";

// // Memoize component to prevent unnecessary re-renders
// const Thumbnail = React.memo(({ url, size }) => {
// 	console.log("URL",url)
//   return (
//     <FastImage
//       source={{
//         uri: utils.thumbnail(url), // Ensure this returns optimized URL
//         priority: FastImage.priority.low, // Lower priority for non-critical images
//         cache: FastImage.cacheControl.immutable, // Optimize caching strategy
//       }}
//       style={{
//         width: size,
//         height: size,
//         borderRadius: size / 2,
//         backgroundColor: '#e0e0e0',
//       }}
//       resizeMode={FastImage.resizeMode.cover} // Proper image fitting
//       onError={() => console.log('Error loading thumbnail')} // Error handling
//     />
//   );
// });

// export default Thumbnail;