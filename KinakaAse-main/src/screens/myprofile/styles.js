/** @format */

import { StyleSheet, Platform } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors, Spacing, Typography } from "../../styles";

let LEFT_PADDING = wp(5);

export default styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: Colors.WHITE,
  },
  header: {
    backgroundColor: '#2D2C33',
    height: hp(22),
    paddingVertical: hp(1),
  },
  headerControler: {
    height: hp(4),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: LEFT_PADDING,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    height: 16,
    width: 16,
    resizeMode: "contain",
  },
  editIcon: {
    height: 22,
    width: 22,
    resizeMode: "contain",
  },
  label: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.OBJECTIVITY_MEDIUM,
    color: Colors.WHITE,
    marginLeft: Spacing.WIDTH_3P,
    textAlign: "left",
    marginTop: Platform.OS == "ios" ? 2 : 0,
  },
  profileView: {
    height: wp(27),
    paddingHorizontal: LEFT_PADDING,
    zIndex: 1,
    marginTop: -wp(27) / 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  imageContainer: {
    backgroundColor: Colors.WHITE,
    borderWidth: wp(1),
    borderColor: Colors.WHITE,
    borderRadius: Spacing.PRIMARY_BORDER_RADIUS,
    overflow: "hidden",
    width: wp(28),
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileViewIamge: {
    height: "100%",
    width: "100%",
  },
  userName: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.OBJECTIVITY_MEDIUM,
    marginHorizontal: LEFT_PADDING,
    marginTop: hp(2),
    color: Colors.TEXT_COLOR,
  },
  userBio: {
    fontSize: Typography.FONT_SIZE_11,
    fontFamily: Typography.OBJECTIVITY_REGULAR,
    marginHorizontal: LEFT_PADDING,
    lineHeight: 16,
    marginTop: Platform.OS == "ios" ? Spacing.WIDTH_3P : Spacing.WIDTH_2P,
    color: Colors.BLACK,
  },
  follow: {
    flexDirection: "row",
    marginStart: LEFT_PADDING,
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  userContacts: {
    flexDirection: "row",
    marginTop: hp(1.5),
  },
  followNumberCount: {
    fontFamily: Typography.OBJECTIVITY_MEDIUM,
    fontSize: Typography.FONT_SIZE_16,
    color: Colors.TEXT_COLOR,
  },
  followText: {
    marginStart: wp(2),
    fontFamily: Typography.OBJECTIVITY_REGULAR,
    fontSize: Typography.FONT_SIZE_12,
    color: Colors.TEXT_COLOR,
  },
  headerChannel: {
    height: hp(4.8),
    backgroundColor: Colors.CHANNELS,
    // marginVertical: wp( 2.5 ),
    marginTop: 5,
    justifyContent: "center",
  },
  channelsText: {
    marginHorizontal: LEFT_PADDING,
    fontFamily: Typography.OBJECTIVITY_MEDIUM,
    fontSize: Typography.FONT_SIZE_12,
    color: Colors.TEXT_COLOR,
  },
  userContainer: {
    borderWidth: 0.5,
    borderColor: Colors.CHANNELS,
    flexDirection: "column",
    // marginLeft:1
  },
  postCounter: {
    position: "absolute",
    bottom: 8,
    marginLeft: 7,
    left: 2,
  },
  postCounterText: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_9,
    fontFamily: Typography.OBJECTIVITY_REGULAR,
    textAlign: "center",
    marginTop: 5,
  },
});
