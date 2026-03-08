// chakra imports
import { Box, Flex, Stack, Text, useColorModeValue } from '@chakra-ui/react';
//   Custom components
import Brand from 'components/sidebar/components/Brand';
import Links from 'components/sidebar/components/Links';
import { IRoute } from 'types/navigation';

// FUNCTIONS

interface SidebarContentProps {
	routes: IRoute[];
}

function SidebarContent(props: SidebarContentProps) {
	const { routes } = props;
	const menuLabelColor = useColorModeValue('gray.500', 'gray.400');
	const menuRoutes = routes.filter((r) => !r.secondary);
	const otherRoutes = routes.filter((r) => r.secondary);
	// SIDEBAR
	return (
		<Flex direction='column' height='100%' pt='25px' borderRadius='30px'>
			<Brand />
			<Stack direction='column' mt='8px' mb='auto'>
				<Text px='20px' fontSize='xs' fontWeight='700' color={menuLabelColor} mb='8px'>MENU</Text>
				<Box ps='20px' pe={{ lg: '16px', '2xl': '16px' }}>
					<Links routes={menuRoutes} />
				</Box>
				{otherRoutes.length > 0 && (
					<>
						<Text px='20px' pt='24px' fontSize='xs' fontWeight='700' color={menuLabelColor} mb='8px'>OTHER</Text>
						<Box ps='20px' pe={{ lg: '16px', '2xl': '16px' }}>
							<Links routes={otherRoutes} />
						</Box>
					</>
				)}
			</Stack>
		</Flex>
	);
}

export default SidebarContent;
