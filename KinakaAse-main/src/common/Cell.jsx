import { View } from "react-native"


function Cell({ children }) {
	return (
		<View
			style={{
				paddingHorizontal: 12,
				flexDirection: 'row',
				alignItems: 'center',
				// borderBottomWidth: 1,
				// borderColor: '#f0f0f0',
				minHeight: 85,
				maxHeight:85,
				width:'95%'
			}}
		>
			{children}
		</View>
	)
}


export default Cell