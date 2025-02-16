import React, { memo } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import styles from './styles';

const tabs = ["KinakaAse",'Reels'];

const Tabs = memo(({ activeTab, setActiveTab }) => (
  <View style={styles.tabsContainer}>
    {tabs.map((tab) => (
      <TouchableOpacity
        key={tab}
        style={[styles.tab, activeTab === tab && styles.activeTab]}
        onPress={() => setActiveTab(tab)}
        activeOpacity={0.7}>
        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
          {tab}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
));

export default Tabs;